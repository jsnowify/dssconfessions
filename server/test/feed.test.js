const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../app");
const { adapter } = require("../test-support/database.cjs");
const { sharedRateLimitParams } = require("../utils/rate-limit");
const { startFixture } = require("../../scripts/performance/fixture.cjs");

test("one-call feed preserves public reads, shared quotas and legacy compatibility", async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const { db, env, id, calls } = fixture;
  const database = adapter(db, calls);
  const legacyDatabase = {
    from: table => database.from(table),
    rpc: (name, args) => name === "read_confession_feed"
      ? Promise.resolve({ error: { code: "PGRST202" } }) : database.rpc(name, args),
  };
  const serve = async database => {
    const server = createApp({ env, database }).listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}`;
  };
  const legacy = await serve(legacyDatabase);
  let client = 0;
  const request = async (path = "/api/confessions", origin = fixture.origin, ip = `198.51.100.${++client}`) => {
    const response = await fetch(origin + path, { headers: { "x-forwarded-for": ip } });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };

  await t.test("returns only public fields and visible reply counts in one call", async () => {
    await db.query("insert into public.replies(confession_id,song_name,artist_name,spotify_track_id,is_hidden) values ($1,'Sample Song','Sample Artist',$2,false),($1,'Sample Song','Sample Artist',$2,true)", [id, fixture.track.id]);
    const before = calls.length;
    const result = await request();
    assert.equal(result.status, 200);
    assert.equal(result.body.length, 20);
    assert.equal(result.body.find(row => row.id === id).reply_count, 1);
    assert.deepEqual(Object.keys(result.body[0]).sort(), ["id", "recipient_to", "sender_from", "content", "song_name", "artist_name", "album_art", "spotify_url", "created_at", "poke_count", "is_automated", "reply_count"].sort());
    assert.deepEqual(calls.slice(before).map(call => call.rpc), ["read_confession_feed"]);
    assert.match(result.headers.get("server-timing"), /app;dur=\d+\.\d, db;dur=\d+\.\d, db_calls;desc="1"/);
    assert.equal(result.headers.get("cache-control"), "no-store");
  });

  await t.test("matches the original path for pagination, searches, ids, latest and validation", async () => {
    await db.query("insert into public.confessions(recipient_to,content) values ($1,'Fictional wildcard example')", ["50%_\\"]);
    for (const path of [
      "/api/confessions", "/api/confessions?limit=2", "/api/confessions?latest=1",
      "/api/confessions?latest=1&limit=3", "/api/confessions?before=2020-01-01",
      "/api/confessions?before=" + encodeURIComponent(new Date(Date.now() - 3600000).toISOString()) + "&limit=2",
      "/api/confessions?to=" + encodeURIComponent("50%_\\"),
      "/api/confessions?to=SAMPLE%201&limit=2", "/api/confessions?to=SAMPLE&limit=0",
      `/api/confessions?id=${id}&to=missing&before=2020-01-01`,
      "/api/confessions?id=00000000-0000-4000-8000-000000000000",
      "/api/confessions?to=a&to=b", "/api/confessions?latest=0",
      "/api/confessions?id=invalid", "/api/confessions?before=invalid",
    ]) {
      const current = await request(path);
      const original = await request(path, legacy);
      assert.equal(current.status, original.status, path);
      // PGlite returns timestamptz columns as Date objects, while jsonb uses
      // ISO strings with an offset. Compare the same timestamp instant.
      const normalize = body => Array.isArray(body)
        ? body.map(row => ({ ...row, created_at: new Date(row.created_at).toISOString() })) : body;
      assert.deepEqual(normalize(current.body), normalize(original.body), path);
    }
  });

  await t.test("moderation is reflected immediately without caching", async () => {
    await db.query("update public.confessions set is_hidden=true where id=$1", [id]);
    assert.deepEqual((await request(`/api/confessions?id=${id}`)).body, []);
    assert.ok(!(await request()).body.some(row => row.id === id));
    await db.query("update public.confessions set is_hidden=false where id=$1", [id]);
  });

  await t.test("60 concurrent reads succeed and the rest receive the unchanged 429", async () => {
    const ip = "203.0.113.70";
    const results = await Promise.all(Array.from({ length: 70 }, () => request("/api/confessions?latest=1", fixture.origin, ip)));
    assert.equal(results.filter(result => result.status === 200).length, 60);
    const rejected = results.filter(result => result.status === 429);
    assert.equal(rejected.length, 10);
    assert.deepEqual(rejected[0].body, { error: "Too many requests. Please slow down." });
    assert.ok(Number(rejected[0].headers.get("retry-after")) > 0);
    // Other endpoints use the same key and cannot evade the exhausted quota.
    assert.equal((await request(`/api/confessions/${id}/settings`, fixture.origin, ip)).status, 429);
    assert.ok(!JSON.stringify(calls).includes(ip));
  });

  await t.test("optional-schema fallback rolls back the failed RPC quota increment", async () => {
    await db.exec("alter table public.confessions rename column is_automated to legacy_automation");
    try {
      const ip = "203.0.113.71";
      const result = await request(`/api/confessions?id=${id}`, fixture.origin, ip);
      assert.equal(result.status, 200);
      assert.equal(result.body[0].is_automated, false);
      const { p_key } = sharedRateLimitParams({ env, scope: "read", client: ip, windowMs: 60000, limit: 60 });
      assert.equal((await db.query("select hits from app_private.api_rate_limits where key=$1", [p_key])).rows[0].hits, 1);
    } finally { await db.exec("alter table public.confessions rename column legacy_automation to is_automated"); }
  });

  await t.test("database errors and malformed RPC results never bypass protection", async () => {
    for (const rpcResult of [{ error: { code: "42501" } }, { data: { allowed: true } }]) {
      let attempts = 0;
      const broken = await serve({ rpc: () => { attempts++; return Promise.resolve(rpcResult); } });
      assert.equal((await request("/api/confessions", broken)).status, 503);
      assert.equal(attempts, 1);
    }
  });

  await t.test("RPC is invoker-only and executable solely by the server role", async () => {
    const signature = "public.read_confession_feed(text,integer,integer,uuid,text,timestamptz,boolean,integer)";
    const { rows } = await db.query(`select
      has_function_privilege('anon', $1, 'execute') as anon,
      has_function_privilege('authenticated', $1, 'execute') as authenticated,
      has_function_privilege('service_role', $1, 'execute') as service,
      (select prosecdef from pg_proc where oid=$1::regprocedure) as definer`, [signature]);
    assert.deepEqual(rows[0], { anon: false, authenticated: false, service: true, definer: false });
    await db.exec("set role service_role");
    const key = "c".repeat(64);
    const result = await db.query("select public.read_confession_feed($1,60,60,p_latest=>true) as result", [key]);
    assert.equal(result.rows[0].result.allowed, true);
    assert.equal(result.rows[0].result.confessions.length, 20);
    await db.exec("reset role");
  });
});
