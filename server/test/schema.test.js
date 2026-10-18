const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { pg_trgm } = require("@electric-sql/pglite/contrib/pg_trgm");
const { createApp } = require("../app");
const { checkSchema, columns, functions } = require("../scripts/check-schema");
const { instrumentDatabase } = require("../utils/database-diagnostics");

const sql = readFileSync(
  join(
    __dirname,
    "../../supabase/migrations/20261018110837_schema_catch_up.sql",
  ),
  "utf8",
);
const repliesMigration = readFileSync(
  join(
    __dirname,
    "../../supabase/migrations/20261018140000_replies_tracklist_cap.sql",
  ),
  "utf8",
);
const base = `create role anon; create role authenticated; create role service_role bypassrls;
create table public.confessions(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),recipient_to text not null,sender_from text default 'Anonymous',content text not null,song_name text,artist_name text,album_art text,spotify_url text);
insert into public.confessions(id,recipient_to,content) values('11111111-1111-4111-8111-111111111111','Fixture recipient','Fixture content');`;

function sqlClient(db) {
  return {
    from(table) {
      assert.ok(Object.hasOwn(columns, table));
      let column;
      return {
        select(name) {
          assert.ok(columns[table].includes(name));
          column = name;
          return this;
        },
        async limit() {
          try {
            return {
              data: (
                await db.query(
                  `select "${column}" from public."${table}" limit 1`,
                )
              ).rows,
            };
          } catch (error) {
            return { error };
          }
        },
      };
    },
    async rpc(name, args, options) {
      assert.equal(
        options.get,
        true,
        "probes must request read-only GET transactions",
      );
      assert.ok(
        name === "check_rate_limit_column" ||
          functions.some((fn) => fn.name === name),
      );
      try {
        await db.exec("begin read only");
        const entries = Object.entries(args);
        const value = (
          await db.query(
            `select public.${name}(${entries.map(([key], i) => `${key} => $${i + 1}`).join(",")}) as result`,
            entries.map(([, value]) => value),
          )
        ).rows[0]?.result;
        await db.exec("rollback");
        return { data: value };
      } catch (error) {
        await db.exec("rollback");
        return { error };
      }
    },
  };
}

test("one-file catch-up repairs legacy, partial and current schemas without losing data", async (t) => {
  const db = new PGlite({ extensions: { pg_trgm } });
  t.after(() => db.close());
  await db.exec(base);
  // The older feature migration depends on trending-searches.sql. Running it
  // first rolls the whole transaction back, including the four new columns.
  const oldFeatures = readFileSync(
    join(
      __dirname,
      "../../supabase/migrations/20261018100410_anonymous_features.sql",
    ),
    "utf8",
  );
  await assert.rejects(db.exec(oldFeatures), (error) => error.code === "42P01");
  await db.exec("rollback");
  assert.equal(
    (
      await db.query(
        "select count(*)::int as count from information_schema.columns where table_schema='public' and table_name='confessions' and column_name='is_hidden'",
      )
    ).rows[0].count,
    0,
  );
  const original = (
    await db.query(
      "select id,recipient_to,content,created_at from public.confessions",
    )
  ).rows;
  // Partial manual execution: tables exist, but newer columns/defaults do not.
  await db.exec(
    "create table public.replies(id uuid primary key); create table public.reports(id uuid primary key); create table public.search_terms(term text primary key,hits integer); insert into public.search_terms values('fixture',null)",
  );
  await db.exec(sql);
  await db.exec(sql);
  // A database that already ran all original feature SQL is also compatible.
  await db.exec(oldFeatures);
  await db.exec(sql);
  assert.deepEqual(
    (
      await db.query(
        "select id,recipient_to,content,created_at from public.confessions",
      )
    ).rows,
    original,
  );
  assert.deepEqual(
    (
      await db.query(
        "select is_hidden,needs_review,allow_replies,delete_key_hash from public.confessions",
      )
    ).rows[0],
    {
      is_hidden: false,
      needs_review: false,
      allow_replies: true,
      delete_key_hash: null,
    },
  );
  // Existing moderation and author keys must survive another run.
  await db.exec(
    "update public.confessions set is_hidden=true,needs_review=true,allow_replies=false,delete_key_hash='fixture-only-hash'",
  );
  await db.exec(sql);
  await db.exec(repliesMigration);
  assert.deepEqual(
    (
      await db.query(
        "select is_hidden,needs_review,allow_replies,delete_key_hash from public.confessions",
      )
    ).rows[0],
    {
      is_hidden: true,
      needs_review: true,
      allow_replies: false,
      delete_key_hash: "fixture-only-hash",
    },
  );
  await db.exec("set role service_role");
  const output = [];
  const check = await checkSchema(sqlClient(db), (line) => output.push(line));
  assert.deepEqual(check, { passed: 50, failed: 0 }, output.join("\n"));
  assert.ok(!output.join(" ").includes("fixture-only-hash"));
  assert.equal(
    (
      await db.query(
        "select count(*)::int as count from app_private.api_rate_limits",
      )
    ).rows[0].count,
    0,
  );
  assert.equal(
    (await db.query("select count(*)::int as count from public.reports"))
      .rows[0].count,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select hits from public.search_terms where term='fixture'",
      )
    ).rows[0].hits,
    0,
  );
  await db.exec("reset role");
  const privileges = (
    await db.query(
      `select has_table_privilege('anon','public.confessions','select') as anon_read,has_table_privilege('authenticated','public.reports','select') as user_read,has_function_privilege('anon','public.check_rate_limit_column(text)','execute') as probe_access,(select bool_and(relrowsecurity) from pg_class where oid in ('public.confessions'::regclass,'public.replies'::regclass,'public.reports'::regclass,'public.search_terms'::regclass,'public.poke_log'::regclass,'app_private.api_rate_limits'::regclass)) as rls`,
    )
  ).rows[0];
  assert.deepEqual(privileges, {
    anon_read: false,
    user_read: false,
    probe_access: false,
    rls: true,
  });
});

test("checker fails on missing columns/functions and never prints rows or diagnostic values", async () => {
  const output = [];
  const client = {
    from() {
      return {
        select() {
          return this;
        },
        async limit() {
          return { error: { code: "42703", message: "private fixture data" } };
        },
      };
    },
    async rpc() {
      return { error: { code: "PGRST202", details: "private fixture data" } };
    },
  };
  const result = await checkSchema(client, (line) => output.push(line));
  assert.equal(result.failed, 50);
  assert.equal(result.passed, 0);
  assert.ok(
    output.some((line) =>
      line.includes("public.confessions.is_hidden code=42703"),
    ),
  );
  assert.ok(!output.join(" ").includes("private fixture data"));
});

async function serve(t, database) {
  const server = createApp({
    env: { SPOTIFY_CLIENT_ID: "fixture", SPOTIFY_CLIENT_SECRET: "fixture" },
    database,
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return async (path) => {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
    );
    return { status: response.status, body: await response.json() };
  };
}

function legacyDatabase({ reports = "missing", broken = "is_hidden" } = {}) {
  return {
    from(table) {
      let filtered = false;
      const query = {
        select(names) {
          assert.ok(!names.includes("*") && !names.includes("delete_key_hash"));
          return query;
        },
        eq(name) {
          if (name === "is_hidden") filtered = true;
          return query;
        },
        ilike() {
          return query;
        },
        order() {
          return query;
        },
        async limit() {
          if (table === "reports")
            return reports === "missing"
              ? {
                  error: {
                    code: "42P01",
                    message: 'relation "public.reports" does not exist',
                  },
                }
              : {
                  data: reports === "present" ? [{ id: "fixture-report" }] : [],
                };
          if (filtered || broken !== "is_hidden")
            return {
              error: {
                code: "42703",
                message: `column confessions.${broken} does not exist`,
                details:
                  "Failing row contains (private confession, recipient, 192.0.2.99, secret-key)",
                hint: `Perhaps you meant to reference the column "confessions.id".`,
              },
            };
          return { data: [{ id: "11111111-1111-4111-8111-111111111111" }] };
        },
      };
      return query;
    },
  };
}

test("42703 logs route, code, safe message/details/hint; clients receive only generic 503", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (...args) => logs.push(args.join(" ")));
  const request = await serve(t, legacyDatabase({ broken: "content" }));
  const result = await request("/api/confessions?to=PrivateRecipient");
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, {
    error: "Stories are unavailable. Please try again shortly.",
  });
  const log = logs.join("\n");
  assert.match(log, /GET \/api\/confessions confessions select/);
  for (const field of ["code", "message", "details", "hint"])
    assert.ok(log.includes(`"${field}"`));
  assert.match(log, /42703/);
  assert.match(log, /column confessions.content does not exist/);
  assert.ok(
    !/private confession|PrivateRecipient|192\.0\.2\.99|secret-key/i.test(log),
  );
  assert.ok(!JSON.stringify(result.body).includes("42703"));
});

test("legacy fallback keeps feed, browse, lookup and health readable, but fails closed around reports", async (t) => {
  t.mock.method(console, "error", () => {});
  const warnings = [];
  t.mock.method(console, "warn", (line) => warnings.push(line));
  for (const reports of ["missing", "empty"]) {
    const request = await serve(t, legacyDatabase({ reports }));
    for (const path of [
      "/api/confessions",
      "/api/confessions?to=fixture",
      "/api/confessions?id=11111111-1111-4111-8111-111111111111",
      "/api/health",
    ])
      assert.equal((await request(path)).status, 200);
  }
  assert.ok(
    warnings.every(
      (line) => line.includes("is_hidden") && line.includes("check:schema"),
    ),
  );
  const guarded = await serve(t, legacyDatabase({ reports: "present" }));
  assert.equal((await guarded("/api/confessions")).status, 503);
});

test("database instrumentation catches rejected RPCs without logging inputs", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (...args) => logs.push(args.join(" ")));
  const db = instrumentDatabase({
    rpc: async () => {
      throw { code: "PGRST202", message: "private-input" };
    },
  });
  await assert.rejects(async () =>
    db.rpc("visible_top_searches", { private: "private-input" }),
  );
  assert.equal(logs.length, 1);
  assert.ok(logs[0].includes("rpc:visible_top_searches"));
  assert.ok(!logs[0].includes("private-input"));
});
