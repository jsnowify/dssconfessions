const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");

test("rate-limit migration enforces quotas, expiry, RLS and service-only execution", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  const migration = readFileSync(join(__dirname, "../../supabase/migrations/20261018080243_serverless_rate_limits.sql"), "utf8");
  await db.exec(migration);

  const permissions = await db.query(`select
    has_function_privilege('anon', 'public.consume_api_rate_limit(text,integer,integer)', 'execute') as anon_execute,
    has_function_privilege('authenticated', 'public.consume_api_rate_limit(text,integer,integer)', 'execute') as user_execute,
    has_function_privilege('service_role', 'public.consume_api_rate_limit(text,integer,integer)', 'execute') as service_execute,
    (select relrowsecurity from pg_class where oid = 'app_private.api_rate_limits'::regclass) as rls_enabled,
    (select prosecdef from pg_proc where oid = 'public.consume_api_rate_limit(text,integer,integer)'::regprocedure) as definer`);
  assert.deepEqual(permissions.rows[0], { anon_execute: false, user_execute: false, service_execute: true, rls_enabled: true, definer: false });

  await db.exec("set role anon;");
  await assert.rejects(db.query("select public.consume_api_rate_limit($1,60,2)", ["a".repeat(64)]), /permission denied/);
  await db.exec("set role service_role;");
  const consume = async (key = "a".repeat(64)) => {
    const { rows } = await db.query("select public.consume_api_rate_limit($1,60,2) as result", [key]);
    return rows[0].result;
  };
  assert.equal((await consume()).allowed, true);
  assert.equal((await consume()).remaining, 0);
  const blocked = await consume();
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retry_after > 0 && blocked.retry_after <= 60);
  assert.equal((await consume("b".repeat(64))).allowed, true);

  await db.query("update app_private.api_rate_limits set expires_at = now() - interval '1 second' where key = $1", ["a".repeat(64)]);
  assert.equal((await consume()).allowed, true);
  await db.query("insert into app_private.api_rate_limits values ($1, 1, now() - interval '2 days')", ["c".repeat(64)]);
  await consume();
  assert.equal((await db.query("select count(*)::integer as count from app_private.api_rate_limits where key = $1", ["c".repeat(64)])).rows[0].count, 0);
  await assert.rejects(db.query("select public.consume_api_rate_limit($1,0,2)", ["d".repeat(64)]), /Invalid rate-limit/);
});
