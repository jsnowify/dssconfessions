const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { createApp } = require("../app");
const { createSearchTracker } = require("../utils/search-trends");

const env = { SUPABASE_SERVICE_ROLE: "test-server-only-secret" };

test("trackers share normalized client/term quotas across instances and expiry", async () => {
  let time = 0;
  const calls = [];
  const tasks = [];
  const counters = new Map();
  const options = {
    env,
    background: (task) => tasks.push(task),
    getDatabase: () => ({
      rpc: async (name, params) => {
        calls.push([name, params]);
        if (name === "increment_search_term") return {};
        const expiry = counters.get(params.p_key);
        const allowed = expiry === undefined || expiry <= time;
        if (allowed)
          counters.set(params.p_key, time + params.p_window_seconds * 1000);
        return { data: { allowed } };
      },
    }),
  };
  const track = createSearchTracker(options);
  const otherInstance = createSearchTracker(options);
  track("192.0.2.1", "  Ry  ");
  otherInstance("192.0.2.1", "RY");
  track("192.0.2.2", "ry");
  track("192.0.2.1", "snowi");
  track("192.0.2.1", "a");
  track("192.0.2.1", "a".repeat(41));
  await Promise.all(tasks);
  assert.equal(
    calls.filter(([name]) => name === "increment_search_term").length,
    3,
  );
  const quotas = calls.filter(([name]) => name === "consume_api_rate_limit");
  assert.equal(quotas.length, 4);
  assert.equal(quotas[0][1].p_key, quotas[1][1].p_key);
  for (const [, params] of quotas) {
    assert.match(params.p_key, /^[a-f0-9]{64}$/);
    assert.equal(params.p_window_seconds, 600);
    assert.equal(params.p_limit, 1);
    assert.deepEqual(Object.keys(params).sort(), [
      "p_key",
      "p_limit",
      "p_window_seconds",
    ]);
  }
  assert.ok(!JSON.stringify(calls).includes("192.0.2."));
  assert.ok(!JSON.stringify(calls).includes(env.SUPABASE_SERVICE_ROLE));
  time = 600000;
  createSearchTracker(options)("192.0.2.1", "ry");
  await Promise.all(tasks);
  assert.equal(
    calls.filter(([name]) => name === "increment_search_term").length,
    4,
  );
});

test("store outages, malformed results and missing secrets skip counting without rejecting", async () => {
  for (const response of [
    { error: { message: "private" } },
    { data: {} },
    { data: { allowed: false } },
    null,
  ]) {
    const tasks = [];
    const calls = [];
    const track = createSearchTracker({
      env,
      background: (task) => tasks.push(task),
      getDatabase: () => ({
        rpc: async (name) => {
          calls.push(name);
          if (response === null) throw new Error("private");
          return response;
        },
      }),
    });
    track("192.0.2.1", "ry");
    await Promise.all(tasks);
    assert.deepEqual(calls, ["consume_api_rate_limit"]);
  }
  const tasks = [];
  createSearchTracker({
    env: {},
    background: (task) => tasks.push(task),
    getDatabase: () => {
      throw new Error("must not access database");
    },
  })("192.0.2.1", "ry");
  await Promise.all(tasks);
});

test("routes count only matching searches without waiting and return bounded cached trends", async (t) => {
  const calls = [];
  let rows = [{ id: "one" }];
  let fail = false;
  let resolveIncrement;
  let resolveQuota;
  const tasks = [];
  const database = {
    rpc(name, params) {
      calls.push([name, params]);
      if (name === "visible_top_searches")
        return Promise.resolve(
          fail ? { error: {} } : { data: [{ term: "ry", hits: 3 }] },
        );
      if (name === "consume_api_rate_limit")
        return new Promise((resolve) => {
          resolveQuota = resolve;
        });
      return new Promise((resolve) => {
        resolveIncrement = resolve;
      });
    },
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        ilike() {
          return query;
        },
        gte(...args) {
          calls.push(["gte", ...args]);
          return query;
        },
        order(...args) {
          calls.push(["order", ...args]);
          return query;
        },
        async limit(limit) {
          calls.push(["limit", table, limit]);
          if (fail) throw new Error("private error");
          return {
            data: table === "search_terms" ? [{ term: "ry", hits: 3 }] : rows,
          };
        },
      };
      return query;
    },
  };
  const server = createApp({
    env,
    database,
    background: (task) => tasks.push(task),
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const get = (path) =>
    fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      signal: AbortSignal.timeout(2000),
    });
  assert.equal((await get("/api/confessions?to=%20RY%20")).status, 200);
  // Neither the shared quota nor the increment may hold the HTTP response open.
  assert.equal(
    calls.some(([name]) => name === "increment_search_term"),
    false,
  );
  resolveQuota({ data: { allowed: true } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    calls.find(([name]) => name === "increment_search_term"),
    ["increment_search_term", { p_term: "ry" }],
  );
  resolveIncrement({});
  await Promise.all(tasks);
  // A later limiter outage must not turn a successful search into an error.
  const outageSearch = await get("/api/confessions?to=snowi");
  assert.equal(outageSearch.status, 200);
  assert.deepEqual(await outageSearch.json(), [{ id: "one", reply_count: 0 }]);
  resolveQuota({ error: { message: "store offline" } });
  await Promise.all(tasks);
  await get("/api/confessions");
  await get("/api/confessions?to=a");
  await get("/api/confessions?to=" + "b".repeat(41));
  rows = [];
  await get("/api/confessions?to=missing");
  assert.equal(
    calls.filter(([name]) => name === "increment_search_term").length,
    1,
  );
  const trends = await get("/api/top-searches?limit=999");
  assert.equal(trends.status, 200);
  assert.deepEqual(await trends.json(), [{ term: "ry", hits: 3 }]);
  assert.equal(trends.headers.get("cache-control"), "no-store");
  assert.ok(
    calls.some(
      (call) => call[0] === "visible_top_searches" && call[1].p_limit === 20,
    ),
  );
  await get("/api/top-searches?limit=invalid");
  assert.ok(
    calls.some(
      (call) => call[0] === "visible_top_searches" && call[1].p_limit === 8,
    ),
  );
  fail = true;
  const failure = await get("/api/top-searches");
  assert.equal(failure.status, 503);
  assert.equal(failure.headers.get("cache-control"), "no-store");
  assert.deepEqual(await failure.json(), {
    error: "Trending searches are unavailable.",
  });
});

test("increment failures are caught after consuming the shared quota", async () => {
  for (const throws of [true, false]) {
    const tasks = [];
    const calls = [];
    const track = createSearchTracker({
      env,
      background: (task) => tasks.push(task),
      getDatabase: () => ({
        rpc: async (name) => {
          calls.push(name);
          if (name === "consume_api_rate_limit")
            return { data: { allowed: true } };
          if (throws) throw new Error("private increment failure");
          return { error: { message: "private increment failure" } };
        },
      }),
    });
    track("192.0.2.1", "ry");
    await Promise.all(tasks);
    assert.deepEqual(calls, [
      "consume_api_rate_limit",
      "increment_search_term",
    ]);
  }
});

test("real SQL shares cooldowns across trackers, expires quotas and restricts access", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  await db.exec(
    readFileSync(
      join(
        __dirname,
        "../../supabase/migrations/20261018080243_serverless_rate_limits.sql",
      ),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      join(__dirname, "../../supabase/trending-searches.sql"),
      "utf8",
    ),
  );
  await db.exec("set role service_role;");
  await db.exec(
    "select public.increment_search_term(' Ry '); select public.increment_search_term('ry'); select public.increment_search_term('RY'); select public.increment_search_term('x');",
  );
  const { rows } = await db.query(
    "select term, hits, last_searched is not null as timestamp_set from public.search_terms",
  );
  assert.deepEqual(rows, [{ term: "ry", hits: 3, timestamp_set: true }]);
  const tasks = [];
  const database = {
    rpc: async (name, params) => {
      if (name === "consume_api_rate_limit") {
        const { rows } = await db.query(
          "select public.consume_api_rate_limit($1,$2,$3) as result",
          [params.p_key, params.p_window_seconds, params.p_limit],
        );
        return { data: rows[0].result };
      }
      await db.query("select public.increment_search_term($1)", [
        params.p_term,
      ]);
      return {};
    },
  };
  const options = {
    env,
    getDatabase: () => database,
    background: (task) => tasks.push(task),
  };
  for (let i = 0; i < 8; i++)
    createSearchTracker(options)("192.0.2.1", "Snowi");
  await Promise.all(tasks);
  assert.equal(
    (await db.query("select hits from public.search_terms where term='snowi'"))
      .rows[0].hits,
    1,
  );
  const counters = (
    await db.query(
      "select key, hits, expires_at > now() as live from app_private.api_rate_limits",
    )
  ).rows;
  assert.equal(counters.length, 1);
  assert.match(counters[0].key, /^[a-f0-9]{64}$/);
  assert.equal(counters[0].live, true);
  await db.exec(
    "update app_private.api_rate_limits set expires_at = now() - interval '1 second'",
  );
  createSearchTracker(options)("192.0.2.1", "snowi");
  await Promise.all(tasks);
  assert.equal(
    (await db.query("select hits from public.search_terms where term='snowi'"))
      .rows[0].hits,
    2,
  );
  await db.exec("set role anon;");
  await assert.rejects(
    db.query("select public.increment_search_term('ry')"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select * from public.search_terms"),
    /permission denied/,
  );
});
