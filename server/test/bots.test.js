const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { pg_trgm } = require("@electric-sql/pglite/contrib/pg_trgm");
const { createApp } = require("../app");
const {
  hashAdminPassword,
  createAdminSession,
  validSession,
} = require("../bots/admin-auth");
const OWNER_PASSWORD = "fixture-owner-password";
const {
  DEFAULT_SETTINGS,
  digestContent,
  tooSimilar,
  validateSettings,
} = require("../bots/generation");

const TRACK = "0123456789ABCDEFGHIJKL";
const { entries, SOURCE } = require("../bots/story-library");
const MIGRATION = "20261019024537_confession_bots.sql";
const DISCLOSURE_MIGRATION = "20261019034400_bot_disclosure_in_recipient.sql";
const fiction = [
  "Sometimes the quiet walk home feels warmer than all the noisy conversations I had during the day.",
  "I finally finished the little goal that used to scare me. Tonight this playlist feels like permission to begin again.",
  "A friend saved the last piece of bread without making a big deal about it. That small kindness has stayed with me.",
  "There are songs I skip because the first note still brings back a whole season of waiting for something to change.",
];

test("bot jobs, permissions and HTTP workflow against real PostgreSQL", async (t) => {
  const db = new PGlite({ extensions: { pg_trgm } });
  t.after(() => db.close());
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  await db.exec(
    "create table public.confessions(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),recipient_to text not null,sender_from text default 'Anonymous',content text not null,song_name text,artist_name text,album_art text,spotify_url text);",
  );
  for (const file of [
    "20261018110837_schema_catch_up.sql",
    "20261018140000_replies_tracklist_cap.sql",
    MIGRATION,
    DISCLOSURE_MIGRATION,
    "20261019043830_curated_horror_library.sql",
    "20261019043834_replies_500.sql",
  ])
    await db.exec(
      readFileSync(join(__dirname, "../../supabase/migrations", file), "utf8"),
    );
  const env = {
    VERCEL: "1",
    SUPABASE_SERVICE_ROLE: "service-".repeat(8),
    DELETE_KEY_PEPPER: "pepper-".repeat(8),
    BOT_ADMIN_PASSWORD_HASH: await hashAdminPassword(OWNER_PASSWORD),
    BOT_ADMIN_SESSION_SECRET: "session-secret-".repeat(4),
    CRON_SECRET: "cron-".repeat(8),
    BOT_AI_MODEL: "test/model",
    BOT_GENERATOR: "ai",
    AI_GATEWAY_API_KEY: "fixture-key",
  };
  let text = fiction[0],
    review = true,
    aiStatus = 200,
    aiCalls = 0,
    lostPublish = false;
  let failTrack = false;
  const rpc = async (name, args = {}) => {
    const entries = Object.entries(args);
    assert.match(name, /^[a-z_]+$/);
    const result =
      (
        await db.query(
          `select public.${name}(${entries.map((_, i) => `$${i + 1}`).join(",")}) as result`,
          entries.map(([, v]) =>
            typeof v === "object" ? JSON.stringify(v) : v,
          ),
        )
      ).rows[0]?.result ?? null;
    return result;
  };
  const database = {
    async rpc(name, args) {
      try {
        const data = await rpc(name, args);
        if (lostPublish && args?.p_action === "publish") {
          lostPublish = false;
          throw new Error("lost response");
        }
        return { data };
      } catch (error) {
        return { error: { code: error.code, message: error.message } };
      }
    },
    from(table) {
      assert.match(table, /^[a-z_]+$/);
      let cols = "id",
        filters = [],
        order = "",
        limit = 20;
      const q = {
        select(value) {
          const base = value.replace(",reply_activity:replies(count)", "");
          assert.match(base, /^[a-z_,]+$/);
          cols = value.includes("reply_activity:replies(count)")
            ? `${base},(select jsonb_build_array(jsonb_build_object('count',count(*))) from public.replies r where r.confession_id=confessions.id and r.is_hidden=false) as reply_activity`
            : base;
          return q;
        },
        eq(column, value) {
          if (column === "reply_activity.is_hidden") {
            assert.equal(value, false);
            return q;
          }
          assert.match(column, /^[a-z_]+$/);
          filters.push([column, value]);
          return q;
        },
        order() {
          order = " order by created_at desc";
          return q;
        },
        limit(value) {
          limit = value;
          return q;
        },
        async insert(rows) {
          const row = rows[0];
          try {
            await db.query(
              `insert into public.${table}(${Object.keys(row).join(",")}) values(${Object.keys(
                row,
              )
                .map((_, i) => `$${i + 1}`)
                .join(",")})`,
              Object.values(row),
            );
            return {};
          } catch (error) {
            return { error: { code: error.code, message: error.message } };
          }
        },
        then(resolve, reject) {
          const query = async () => {
            try {
              return {
                data: (
                  await db.query(
                    `select ${cols} from public.${table}${filters.length ? " where " + filters.map(([col], i) => `${col}=$${i + 1}`).join(" and ") : ""}${order} limit ${limit}`,
                    filters.map(([, v]) => v),
                  )
                ).rows,
              };
            } catch (error) {
              return { error: { code: error.code, message: error.message } };
            }
          };
          return query().then(resolve, reject);
        },
      };
      return q;
    },
  };
  const server = createApp({
    env,
    database,
    getToken: async () => "fixture-token",
    botAi: async (url, init) => {
      assert.equal(url, "https://ai-gateway.vercel.sh/v1/chat/completions");
      aiCalls++;
      const body = JSON.parse(init.body);
      assert.equal(body.response_format.json_schema.strict, true);
      const result =
        body.response_format.json_schema.name === "fiction_safety_review"
          ? { safe: review }
          : { content: text, songQuery: "Sample Song" };
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(result) },
            },
          ],
        }),
        { status: aiStatus, headers: { "retry-after": "120" } },
      );
    },
    spotify: {
      get: async (url) => {
        if (url.endsWith("/search"))
          return { data: { tracks: { items: [{ id: TRACK }] } } };
        if (failTrack) throw new Error("Spotify offline");
        return {
          data: {
            id: TRACK,
            name: "Verified song",
            artists: [{ name: "Verified artist" }],
          },
        };
      },
    },
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  let ip = 1;
  let adminCookie = "";
  const request = async (path, body, token) => {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
      {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Admin": "1",
          "x-forwarded-for": `192.0.2.${ip++ % 250}`,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(token === undefined && adminCookie
            ? { Cookie: adminCookie }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    return {
      status: response.status,
      body: await response.json(),
      headers: response.headers,
    };
  };
  const admin = async (path = "", body, token) => {
    if (token === undefined && !adminCookie) {
      const login = await request(
        "/api/admin/bots/login",
        { password: OWNER_PASSWORD },
        null,
      );
      if (login.status !== 200) return login;
      adminCookie = login.headers.get("set-cookie").split(";")[0];
    }
    return request("/api/admin/bots" + path, body, token);
  };
  const count = async (table = "confessions") =>
    (
      await db.query(
        `select count(*)::int as n from ${table.includes(".") ? table : "public." + table}`,
      )
    ).rows[0].n;
  const reset = async () => {
    await db.exec("reset role");
    await db.exec(
      "delete from app_private.confession_bot_jobs;delete from app_private.confession_bots;delete from public.confessions;delete from app_private.api_rate_limits;",
    );
    text = fiction[0];
    review = true;
    aiStatus = 200;
    aiCalls = 0;
    failTrack = false;
    lostPublish = false;
    adminCookie = "";
    await db.exec("set role service_role");
  };
  const save = async (enabled = true, settings = {}) => {
    const response = await admin("/save", {
      enabled,
      settings: { ...DEFAULT_SETTINGS, ...settings },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
  };
  const run = (id, key = randomUUID()) =>
    admin("/run", { botId: id, requestKey: key });

  await t.test(
    "password login issues a protected session and rejects wrong passwords, altered cookies and cross-site writes",
    async () => {
      const wrong = await request(
        "/api/admin/bots/login",
        { password: "incorrect-password" },
        null,
      );
      assert.equal(wrong.status, 401);
      assert.equal(wrong.headers.get("set-cookie"), null);
      const login = await request(
        "/api/admin/bots/login",
        { password: OWNER_PASSWORD },
        null,
      );
      assert.equal(login.status, 200);
      assert.deepEqual(login.body, { authenticated: true });
      const cookie = login.headers.get("set-cookie");
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=Strict/i);
      assert.match(cookie, /Secure/i);
      assert.match(cookie, /Path=\/api\/admin\/bots/i);
      assert.ok(!cookie.includes(OWNER_PASSWORD));
      adminCookie = cookie.split(";")[0];
      assert.equal((await request("/api/admin/bots")).status, 200);
      const session = decodeURIComponent(adminCookie.split("=")[1]);
      assert.equal(validSession(session, env), true);
      assert.equal(
        validSession(
          session.slice(0, -1) + (session.endsWith("0") ? "1" : "0"),
          env,
        ),
        false,
      );
      assert.equal(
        validSession(createAdminSession(env, Date.now() - 1900000), env),
        false,
      );
      const badCookie = await fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/bots`,
        { headers: { Cookie: "dss_bot_admin=invalid" } },
      );
      assert.equal(badCookie.status, 401);
      const csrf = await fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/bots/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: adminCookie },
          body: JSON.stringify({ enabled: false, settings: DEFAULT_SETTINGS }),
        },
      );
      assert.equal(csrf.status, 403);
      const logout = await request("/api/admin/bots/logout", {});
      assert.equal(logout.status, 200);
      assert.match(logout.headers.get("set-cookie"), /^dss_bot_admin=;/);
      adminCookie = "";
      assert.equal((await request("/api/admin/bots")).status, 401);
      const original = env.BOT_ADMIN_PASSWORD_HASH;
      env.BOT_ADMIN_PASSWORD_HASH = await hashAdminPassword(
        "different-fixture-password",
      );
      assert.equal(validSession(session, env), false);
      env.BOT_ADMIN_PASSWORD_HASH = original;
    },
  );
  await t.test(
    "active admin sessions renew; expired removal requests cannot delete posts",
    async () => {
      await reset();
      const bot = await save();
      const published = await run(bot.id);
      assert.equal(published.body.state, "submitted");
      const id = (await db.query("select id from public.confessions limit 1"))
        .rows[0].id;
      const call = async (session) => {
        const response = await fetch(
          `http://127.0.0.1:${server.address().port}/api/admin/bots/remove`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Bot-Admin": "1",
              Cookie: `dss_bot_admin=${session}`,
            },
            body: JSON.stringify({ confessionId: id }),
          },
        );
        return {
          status: response.status,
          headers: response.headers,
          body: await response.json(),
        };
      };
      const expired = await call(createAdminSession(env, Date.now() - 1900000));
      assert.equal(expired.status, 401);
      assert.equal(expired.body.code, "ADMIN_SESSION_REQUIRED");
      assert.equal(expired.headers.get("set-cookie"), null);
      assert.equal(await count(), 1);
      const active = await call(createAdminSession(env, Date.now() - 1700000));
      assert.equal(active.status, 200);
      assert.equal(active.body.removed, true);
      assert.ok(
        validSession(
          decodeURIComponent(
            active.headers.get("set-cookie").split(";")[0].split("=")[1],
          ),
          env,
        ),
      );
      assert.equal(await count(), 0);
    },
  );
  await t.test(
    "password attempts are protected by shared database quotas",
    async () => {
      let last;
      for (let i = 0; i < 11; i++) {
        last = await fetch(
          `http://127.0.0.1:${server.address().port}/api/admin/bots/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Bot-Admin": "1",
              "x-forwarded-for": "192.0.2.254",
            },
            body: JSON.stringify({ password: "wrong-fixture-password" }),
          },
        );
        assert.equal(last.status, i < 10 ? 401 : 429);
        await last.arrayBuffer();
      }
      assert.ok(Number(last.headers.get("retry-after")) > 0);
    },
  );
  await t.test(
    "admin and cron credentials are separate, fail closed and remain server-only",
    async () => {
      assert.equal((await admin("", undefined, null)).status, 401);
      assert.equal((await admin("", undefined, "incorrect-token")).status, 401);
      assert.equal(
        (await request("/api/cron/confession-bots", undefined, OWNER_PASSWORD))
          .status,
        401,
      );
      assert.equal(
        (await request("/api/cron/confession-bots", undefined, env.CRON_SECRET))
          .body.state,
        "idle",
      );
      const dashboard = await admin();
      assert.equal(dashboard.status, 200);
      assert.equal(dashboard.headers.get("cache-control"), "no-store");
      assert.ok(!JSON.stringify(dashboard.body).includes(OWNER_PASSWORD));
      assert.ok(
        !JSON.stringify(dashboard.body).includes(env.BOT_ADMIN_PASSWORD_HASH),
      );
      const secret = env.BOT_ADMIN_SESSION_SECRET;
      env.BOT_ADMIN_SESSION_SECRET = env.SUPABASE_SERVICE_ROLE;
      assert.equal((await admin()).status, 503);
      env.BOT_ADMIN_SESSION_SECRET = secret;
      for (const role of ["anon", "authenticated"]) {
        assert.equal(
          (
            await db.query(
              "select has_function_privilege($1,'public.bot_control(text,jsonb)','execute') as access",
              [role],
            )
          ).rows[0].access,
          false,
        );
        assert.equal(
          (
            await db.query(
              "select has_table_privilege($1,'app_private.confession_bot_jobs','select') as access",
              [role],
            )
          ).rows[0].access,
          false,
        );
      }
      assert.equal(
        (
          await db.query(
            "select bool_and(relrowsecurity) as enabled from pg_class where oid in ('app_private.confession_bots'::regclass,'app_private.confession_bot_jobs'::regclass)",
          )
        ).rows[0].enabled,
        true,
      );
    },
  );
  await t.test(
    "settings validate and bots start disabled; preview never publishes",
    async () => {
      await reset();
      const bot = await save(false);
      assert.equal(bot.enabled, false);
      assert.equal((await run(bot.id)).body.state, "idle");
      assert.equal(
        (
          await admin("/save", {
            enabled: true,
            settings: { ...DEFAULT_SETTINGS, categories: [] },
          })
        ).status,
        400,
      );
      assert.equal(
        (await admin("/preview", { settings: DEFAULT_SETTINGS })).body
          .published,
        false,
      );
      assert.equal(await count(), 0);
      assert.equal(await count("app_private.confession_bot_jobs"), 0);
      const model = env.BOT_AI_MODEL;
      delete env.BOT_AI_MODEL;
      assert.equal(
        (await admin("/save", { enabled: true, settings: DEFAULT_SETTINGS }))
          .status,
        503,
      );
      env.BOT_AI_MODEL = model;
    },
  );
  await t.test(
    "built-in preview and publication use the protected shared workflow without AI credentials",
    async () => {
      await reset();
      const original = { ...env };
      env.BOT_GENERATOR = "local";
      env.BOT_DELETE_KEY_PEPPER = "fixture-local-bot-pepper-".repeat(3);
      delete env.DELETE_KEY_PEPPER;
      delete env.BOT_AI_MODEL;
      delete env.AI_GATEWAY_API_KEY;
      try {
        const preview = await admin("/preview", { settings: DEFAULT_SETTINGS });
        assert.equal(preview.status, 200);
        assert.equal(preview.body.published, false);
        assert.equal(await count(), 0);
        const bot = await save(true, { postLimit: 1 });
        assert.equal((await run(bot.id)).body.state, "submitted");
        assert.equal(aiCalls, 0);
        const row = (
          await db.query(
            "select is_automated,recipient_to,content from public.confessions",
          )
        ).rows[0];
        assert.equal(row.is_automated, true);
        assert.equal(row.recipient_to, "Short Stories");
        assert.ok(!row.content.startsWith("[Automated fiction]"));
        assert.equal((await run(bot.id)).body.state, "idle");
      } finally {
        delete env.BOT_DELETE_KEY_PEPPER;
        Object.assign(env, original);
      }
    },
  );
  await t.test(
    "imported stories have a two-per-Manila-day cap, persistent deduplication, safe retries and fixed schedule",
    async () => {
      await reset();
      const settings = {
        source: SOURCE,
        intervalMinutes: 720,
        language: "Tagalog",
        postLimit: 500,
        allowReplies: true,
      };
      const bot = await save(true, settings);
      const slot = (
        await db.query(
          "select (next_run_at at time zone 'Asia/Manila')::time::text as time from app_private.confession_bots where id=$1",
          [bot.id],
        )
      ).rows[0].time;
      assert.ok(["08:00:00", "20:00:00"].includes(slot));
      const preview = await admin("/preview", {
        settings: { ...DEFAULT_SETTINGS, ...settings },
      });
      assert.equal(preview.status, 200);
      assert.equal(await count(), 0);
      const key = randomUUID();
      lostPublish = true;
      const first = await run(bot.id, key);
      assert.equal(first.body.state, "submitted");
      assert.equal((await run(bot.id, key)).body.state, "submitted");
      const firstJob = (
        await db.query(
          "select * from app_private.confession_bot_jobs where request_key=$1",
          [key],
        )
      ).rows[0];
      assert.equal(firstJob.draft.source, SOURCE);
      assert.equal(
        (await admin("/remove", { confessionId: firstJob.confession_id })).body
          .removed,
        true,
      );
      assert.equal((await run(bot.id)).body.state, "submitted");
      const used = (
        await db.query(
          "select draft->>'storyId' as id from app_private.confession_bot_jobs where status='submitted'",
        )
      ).rows.map((row) => Number(row.id));
      assert.equal(new Set(used).size, 2);
      assert.equal(
        (await run(bot.id)).body.state,
        "idle",
        "removed posts still count toward today's cap",
      );
      const available = await rpc("bot_control", {
        p_action: "library_available",
        p_input: { entries },
      });
      assert.equal(available.length, 498);
      assert.ok(!available.includes(firstJob.draft.storyId));
      await db.exec(
        "update app_private.confession_bot_jobs set updated_at=now()-interval '1 day'; update app_private.confession_bots set next_run_at=now()-interval '1 minute'",
      );
      assert.equal(
        (await request("/api/cron/confession-bots", undefined, env.CRON_SECRET))
          .body.state,
        "submitted",
      );
      assert.equal(
        (await request("/api/cron/confession-bots", undefined, env.CRON_SECRET))
          .body.state,
        "idle",
      );
      assert.equal(
        (
          await rpc("bot_control", {
            p_action: "library_available",
            p_input: { entries },
          })
        ).length,
        497,
      );
      assert.equal(aiCalls, 0);
    },
  );
  await t.test(
    "a previously published raw story is excluded and a fully used collection pauses without fallback generation",
    async () => {
      await reset();
      const bot = await save(true, {
        source: SOURCE,
        intervalMinutes: 720,
        language: "Tagalog",
        postLimit: 500,
      });
      await db.query(
        "insert into public.confessions(recipient_to,content) values('SAMPLE',$1)",
        [entries[0].story],
      );
      let available = await rpc("bot_control", {
        p_action: "library_available",
        p_input: { entries },
      });
      assert.equal(available.length, 499);
      assert.ok(!available.includes(entries[0].id));
      await db.query(
        `insert into app_private.confession_bot_jobs(bot_id,request_key,status,content_digest,draft,updated_at)
      select $1,gen_random_uuid(),'submitted',e->>'digest',jsonb_build_object('source',$3::text,'storyId',e->'id','content',e->>'content'),now()-interval '1 day'
      from jsonb_array_elements($2::jsonb) e`,
        [bot.id, JSON.stringify(entries), SOURCE],
      );
      available = await rpc("bot_control", {
        p_action: "library_available",
        p_input: { entries },
      });
      assert.deepEqual(available, []);
      assert.equal((await run(bot.id)).body.state, "failed");
      assert.equal((await admin()).body.bots[0].enabled, false);
      assert.equal(await count(), 1);
      assert.equal(aiCalls, 0);
    },
  );
  await t.test(
    "database disclosure guard accepts the recipient format and rejects impersonation or draft tampering",
    async () => {
      await reset();
      const bot = await save(true, { postLimit: 2 });
      for (const legacy of [false, true]) {
        const claim = await rpc("bot_control", {
          p_action: "claim",
          p_input: { botId: bot.id, requestKey: randomUUID(), manual: true },
        });
        const lease = { jobId: claim.job.id, lease: claim.job.lease };
        await rpc("bot_control", {
          p_action: "draft",
          p_input: {
            ...lease,
            draft: {
              content: fiction[legacy ? 1 : 0],
              songQuery: "Sample Song",
            },
            digest: digestContent(fiction[legacy ? 1 : 0]),
          },
        });
        const row = {
          recipient_to: legacy ? "A fictional listener" : "Short Stories",
          sender_from: "Mixtape Bot (fiction)",
          content:
            (legacy ? "[Automated fiction]\n\n" : "") + fiction[legacy ? 1 : 0],
          song_name: "Sample Song",
          artist_name: "Sample Artist",
          allow_replies: false,
          delete_key_hash: "a".repeat(64),
        };
        for (const invalid of [
          { ...row, recipient_to: "A real person" },
          { ...row, sender_from: "Anonymous" },
          { ...row, content: "Changed after approval" },
        ]) {
          await assert.rejects(
            rpc("bot_control", {
              p_action: "publish",
              p_input: { ...lease, row: invalid },
            }),
            /Invalid bot submission/,
          );
        }
        assert.equal(
          (
            await rpc("bot_control", {
              p_action: "publish",
              p_input: { ...lease, row },
            })
          ).state,
          "submitted",
        );
      }
      assert.equal(await count(), 2);
    },
  );
  await t.test(
    "simultaneous retry keys publish once through shared validation, Spotify and atomic commit",
    async () => {
      await reset();
      const bot = await save(true, { postLimit: 1 });
      const key = randomUUID();
      const results = await Promise.all(
        Array.from({ length: 12 }, () => run(bot.id, key)),
      );
      assert.ok(results.every((r) => r.status === 200));
      assert.equal(await count(), 1);
      const row = (await db.query("select * from public.confessions")).rows[0];
      assert.equal(row.is_automated, true);
      assert.equal(row.sender_from, "Mixtape Bot (fiction)");
      assert.equal(row.recipient_to, "Short Stories");
      assert.equal(row.content, fiction[0]);
      assert.equal(row.song_name, "Verified song");
      assert.match(row.delete_key_hash, /^[a-f0-9]{64}$/);
      assert.equal((await run(bot.id, key)).body.state, "submitted");
      assert.equal(await count(), 1);
      assert.equal((await run(bot.id)).body.state, "idle");
      assert.equal(aiCalls, 2);
      await db.exec("reset role");
      await db.exec(
        readFileSync(
          join(
            __dirname,
            "../../supabase/migrations/20261019043830_curated_horror_library.sql",
          ),
          "utf8",
        ),
      );
      await db.exec("set role service_role");
      assert.equal(await count(), 1);
      await db.exec("update public.confessions set is_hidden=true");
      assert.deepEqual((await request("/api/confessions")).body, []);
    },
  );
  await t.test(
    "unknown commit outcome cannot duplicate a published post",
    async () => {
      await reset();
      const bot = await save();
      lostPublish = true;
      const key = randomUUID();
      assert.equal((await run(bot.id, key)).body.state, "submitted");
      assert.equal((await run(bot.id, key)).body.state, "submitted");
      assert.equal(await count(), 1);
    },
  );
  await t.test(
    "unsafe, identifying and repeated drafts never publish",
    async () => {
      await reset();
      const bot = await save();
      review = false;
      assert.equal((await run(bot.id)).body.state, "failed");
      assert.equal(await count(), 0);
      review = true;
      text =
        "Email me at private@example.com and tell me about your whole day after class.";
      assert.equal((await run(bot.id)).body.state, "failed");
      assert.equal(await count(), 0);
      text = fiction[0];
      assert.equal((await run(bot.id)).body.state, "submitted");
      assert.equal((await run(bot.id)).body.state, "failed");
      assert.equal(await count(), 1);
      assert.ok(tooSimilar(fiction[0].toUpperCase(), [fiction[0]]));
    },
  );
  await t.test(
    "provider 429 uses durable delayed retry; saved drafts survive Spotify failure",
    async () => {
      await reset();
      const bot = await save();
      aiStatus = 429;
      const key = randomUUID();
      assert.equal((await run(bot.id, key)).body.state, "retry");
      assert.equal(await count(), 0);
      const j = (
        await db.query("select * from app_private.confession_bot_jobs")
      ).rows[0];
      assert.equal(j.error_code, "RATE_LIMIT");
      assert.ok(new Date(j.next_attempt_at) - new Date(j.updated_at) >= 119000);
      assert.equal((await run(bot.id, key)).body.state, "retry");
      aiStatus = 200;
      failTrack = true;
      await db.exec(
        "update app_private.confession_bot_jobs set next_attempt_at=now()-interval '1 second'",
      );
      assert.equal((await run(bot.id, key)).body.state, "retry");
      assert.equal(
        (
          await db.query(
            "select draft is not null as saved from app_private.confession_bot_jobs",
          )
        ).rows[0].saved,
        true,
      );
      const used = aiCalls;
      failTrack = false;
      await db.exec(
        "update app_private.confession_bot_jobs set next_attempt_at=now()-interval '1 second'",
      );
      assert.equal((await run(bot.id, key)).body.state, "submitted");
      assert.equal(aiCalls, used);
      assert.equal(await count(), 1);
    },
  );
  await t.test(
    "stale workers and disabled or edited bots are fenced before publishing",
    async () => {
      await reset();
      const bot = await save();
      const first = await rpc("bot_control", {
        p_action: "claim",
        p_input: { botId: bot.id, requestKey: randomUUID(), manual: true },
      });
      await db.exec(
        "update app_private.confession_bot_jobs set lease_until=now()-interval '1 second'",
      );
      const next = await rpc("bot_control", {
        p_action: "claim",
        p_input: { botId: bot.id, requestKey: randomUUID(), manual: true },
      });
      assert.equal(first.job.id, next.job.id);
      assert.notEqual(first.job.lease, next.job.lease);
      const draft = {
        content: fiction[0],
        songId: TRACK,
        songQuery: "Sample Song",
      };
      assert.equal(
        (
          await rpc("bot_control", {
            p_action: "draft",
            p_input: {
              jobId: first.job.id,
              lease: first.job.lease,
              draft,
              digest: digestContent(text),
            },
          })
        ).state,
        "cancelled",
      );
      await admin("/save", {
        id: bot.id,
        enabled: false,
        settings: bot.settings,
      });
      assert.equal(
        (
          await rpc("bot_control", {
            p_action: "publish",
            p_input: { jobId: next.job.id, lease: next.job.lease, row: {} },
          })
        ).state,
        "cancelled",
      );
      assert.equal(await count(), 0);
    },
  );
  await t.test(
    "cron honors due times and caps; interrupted jobs stop after three attempts",
    async () => {
      await reset();
      const bot = await save(true, { postLimit: 2 });
      assert.equal(
        (await request("/api/cron/confession-bots", undefined, env.CRON_SECRET))
          .body.state,
        "submitted",
      );
      assert.equal(
        (await request("/api/cron/confession-bots", undefined, env.CRON_SECRET))
          .body.state,
        "idle",
      );
      text = fiction[1];
      await db.exec(
        "update app_private.confession_bots set next_run_at=now()-interval '1 second'",
      );
      assert.equal(
        (await request("/api/cron/confession-bots", undefined, env.CRON_SECRET))
          .body.state,
        "submitted",
      );
      assert.equal(await count(), 2);
      assert.equal(
        (
          await db.query(
            "select enabled from app_private.confession_bots where id=$1",
            [bot.id],
          )
        ).rows[0].enabled,
        false,
      );
      await reset();
      const another = await save();
      const key = randomUUID();
      await rpc("bot_control", {
        p_action: "claim",
        p_input: { botId: another.id, requestKey: key, manual: true },
      });
      for (let i = 0; i < 2; i++) {
        await db.exec(
          "update app_private.confession_bot_jobs set lease_until=now()-interval '1 second'",
        );
        assert.equal(
          (
            await rpc("bot_control", {
              p_action: "claim",
              p_input: { botId: another.id, requestKey: key, manual: true },
            })
          ).state,
          "claimed",
        );
      }
      await db.exec(
        "update app_private.confession_bot_jobs set lease_until=now()-interval '1 second'",
      );
      assert.equal(
        (
          await rpc("bot_control", {
            p_action: "claim",
            p_input: { botId: another.id, requestKey: key, manual: true },
          })
        ).state,
        "failed",
      );
      assert.equal(await count(), 0);
      assert.equal(await count("app_private.confession_bot_jobs"), 1);
    },
  );
  await t.test(
    "global posting quota applies to workers and duplicate tombstones survive removal",
    async () => {
      await reset();
      const bot = await save();
      const { createHmac } = require("node:crypto");
      const { ipKeyGenerator } = require("express-rate-limit");
      const key = createHmac("sha256", env.SUPABASE_SERVICE_ROLE)
        .update(`confess:${ipKeyGenerator("confession-automation")}`)
        .digest("hex");
      for (let i = 0; i < 15; i++)
        await rpc("consume_api_rate_limit", {
          p_key: key,
          p_window_seconds: 900,
          p_limit: 15,
        });
      assert.equal((await run(bot.id)).body.state, "retry");
      assert.equal(aiCalls, 0);
      await db.exec(
        "delete from app_private.api_rate_limits;update app_private.confession_bot_jobs set next_attempt_at=now()-interval '1 second'",
      );
      assert.equal((await run(bot.id)).body.state, "submitted");
      const row = (await db.query("select id from public.confessions")).rows[0];
      assert.equal(
        (await admin("/remove", { confessionId: row.id })).body.removed,
        true,
      );
      assert.equal(await count(), 0);
      assert.equal((await run(bot.id)).body.state, "failed");
      assert.equal(await count(), 0);
      const human = await request("/api/confess", {
        to: "SAMPLE",
        content: "SAMPLE",
        song: { id: TRACK },
        is_automated: true,
        automation: { id: randomUUID() },
      });
      assert.equal(human.status, 200);
      const userRow = (
        await db.query("select id,is_automated from public.confessions")
      ).rows[0];
      assert.equal(userRow.is_automated, false);
      assert.equal(
        (await admin("/remove", { confessionId: userRow.id })).body.removed,
        false,
      );
    },
  );

  if (process.env.BOT_BROWSER_VERIFY === "1")
    await t.test(
      "browser administration and npm schema command use isolated SQL storage",
      async () => {
        await reset();
        const http = require("node:http");
        const fs = require("node:fs");
        const path = require("node:path");
        const { promisify } = require("node:util");
        const { execFile } = require("node:child_process");
        const { chromium } = require("playwright");
        const root = path.resolve(__dirname, "../../client/dist");
        const ui = http
          .createServer(async (req, res) => {
            try {
              const url = new URL(req.url, "http://127.0.0.1:4173");
              if (url.pathname.startsWith("/api/")) {
                const proxy = http.request(
                  {
                    hostname: "127.0.0.1",
                    port: server.address().port,
                    path: req.url,
                    method: req.method,
                    headers: req.headers,
                  },
                  (upstream) => {
                    res.writeHead(upstream.statusCode, upstream.headers);
                    upstream.pipe(res);
                  },
                );
                proxy.on("error", () => {
                  res.writeHead(503);
                  res.end();
                });
                req.pipe(proxy);
                return;
              }
              if (url.pathname.startsWith("/rest/v1/")) {
                let result;
                if (url.pathname.includes("/rpc/")) {
                  await db.exec("begin read only");
                  try {
                    result = await database.rpc(
                      url.pathname.split("/").at(-1),
                      Object.fromEntries(
                        [...url.searchParams].map(([k, v]) => [
                          k,
                          v.startsWith("{") ? JSON.parse(v) : v,
                        ]),
                      ),
                    );
                  } finally {
                    await db.exec("rollback");
                  }
                } else
                  result = await database
                    .from(url.pathname.split("/").at(-1))
                    .select(url.searchParams.get("select"))
                    .limit(1);
                res.writeHead(result.error ? 400 : 200, {
                  "Content-Type": "application/json",
                });
                res.end(JSON.stringify(result.error || result.data));
                return;
              }
              const candidate = path.resolve(
                root,
                "." + decodeURIComponent(url.pathname),
              );
              if (
                candidate !== root &&
                !candidate.startsWith(root + path.sep)
              ) {
                res.writeHead(404);
                res.end();
                return;
              }
              const file =
                fs.existsSync(candidate) && fs.statSync(candidate).isFile()
                  ? candidate
                  : path.join(root, "index.html");
              const type =
                {
                  ".html": "text/html",
                  ".js": "application/javascript",
                  ".css": "text/css",
                  ".svg": "image/svg+xml",
                  ".png": "image/png",
                  ".webp": "image/webp",
                }[path.extname(file)] || "application/octet-stream";
              res.writeHead(200, { "Content-Type": type });
              res.end(fs.readFileSync(file));
            } catch {
              res.writeHead(500);
              res.end("Fixture request failed");
            }
          })
          .listen(4173, "127.0.0.1");
        await once(ui, "listening");
        let browser;
        try {
          const [cmd, args] = process.env.npm_execpath
            ? [
                process.execPath,
                [
                  process.env.npm_execpath,
                  "run",
                  "check:schema",
                  "--prefix",
                  "server",
                ],
              ]
            : [
                process.platform === "win32" ? "npm.cmd" : "npm",
                ["run", "check:schema", "--prefix", "server"],
              ];
          const schema = await promisify(execFile)(cmd, args, {
            cwd: join(__dirname, "../.."),
            shell: process.platform === "win32" && !process.env.npm_execpath,
            env: {
              ...process.env,
              SUPABASE_URL: "http://127.0.0.1:4173",
              SUPABASE_SERVICE_ROLE: env.SUPABASE_SERVICE_ROLE,
            },
          });
          assert.match(schema.stdout, /Schema check: 53 passed, 0 failed/);
          console.log(
            "PASS npm run check:schema --prefix server: 53 read-only probes against isolated migrated database.",
          );
          browser = await chromium.launch({ headless: true });
          const page = await browser.newPage({
            viewport: { width: 360, height: 800 },
            isMobile: true,
            hasTouch: true,
            reducedMotion: "reduce",
          });
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          // The API goes only to the isolated fixture above; all captures contain fictional data.
          await page.route("**/api/**", (route) =>
            new URL(route.request().url()).hostname === "127.0.0.1"
              ? route.continue()
              : route.abort(),
          );
          await page.route(
            /(scdn\.co|spotify\.com\/image|fbcdn|imgur)/i,
            (route) =>
              route.fulfill({
                status: 200,
                contentType: "image/svg+xml",
                body: '<svg xmlns="http://www.w3.org/2000/svg"/>',
              }),
          );
          await page.route(/open\.spotify\.com\/embed/i, (route) =>
            route.fulfill({
              status: 200,
              contentType: "text/html",
              body: "Sample Spotify Player",
            }),
          );
          await page.goto("http://127.0.0.1:4173/admin/bots", {
            waitUntil: "domcontentloaded",
          });
          await page
            .getByLabel("Password", { exact: true })
            .fill(OWNER_PASSWORD);
          await page
            .getByRole("button", { name: "Sign in", exact: true })
            .click();
          await page
            .getByRole("heading", { name: "Add a storyteller" })
            .waitFor();
          await page.getByLabel("Bot name").fill("SAMPLE storyteller");
          await page.getByLabel("Total posts").fill("2");
          await page.getByRole("button", { name: "Preview only" }).click();
          await page
            .getByRole("heading", { name: "Fictional draft · unpublished" })
            .waitFor();
          assert.equal(await count(), 0);
          await page.getByRole("button", { name: "Close preview" }).click();
          await page.getByRole("button", { name: "Create bot" }).click();
          await page
            .getByRole("heading", { name: "SAMPLE storyteller" })
            .waitFor();
          const editor = page.getByRole("region", {
            name: "SAMPLE storyteller",
          });
          await editor.getByLabel("Enable publishing after saving").check();
          await editor.getByRole("button", { name: "Save settings" }).click();
          await editor
            .getByRole("button", { name: "Run now · publish one" })
            .click();
          await page
            .getByText("One automated fictional confession was published.", {
              exact: true,
            })
            .waitFor();
          assert.equal(await count(), 1);
          assert.equal(
            await page.locator('meta[name="robots"]').getAttribute("content"),
            "noindex, nofollow",
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          );
          await page.setViewportSize({ width: 1280, height: 900 });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          );
          await page.screenshot({
            path: join(__dirname, "../../.vercel/bot-admin-fixture.png"),
            fullPage: true,
          });
          await page
            .getByRole("button", { name: "Sign out", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Sign in", exact: true })
            .waitFor();
          assert.equal(
            await page.evaluate(() =>
              Object.keys(localStorage).some((k) => /token|admin|bot/i.test(k)),
            ),
            false,
          );
          await page.goto("http://127.0.0.1:4173/");
          await page
            .getByText("To: Short Stories", {
              exact: true,
            })
            .first()
            .waitFor();
          await page.goto("http://127.0.0.1:4173/admin/bots");
          await page
            .getByLabel("Password", { exact: true })
            .fill(OWNER_PASSWORD);
          await page
            .getByRole("button", { name: "Sign in", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Remove bot post", exact: true })
            .click();
          const removal = page.getByRole("dialog", {
            name: "Remove this bot post?",
          });
          await page.context().addCookies([
            {
              name: "dss_bot_admin",
              value: createAdminSession(env, Date.now() - 1900000),
              domain: "127.0.0.1",
              path: "/api/admin/bots",
              httpOnly: true,
              sameSite: "Strict",
            },
          ]);
          await removal
            .getByRole("button", { name: "Remove bot post", exact: true })
            .click();
          await page
            .getByText(
              "Your admin session expired. Sign in again to continue.",
              { exact: true },
            )
            .waitFor();
          assert.equal(await count(), 1);
          await page
            .getByLabel("Password", { exact: true })
            .fill(OWNER_PASSWORD);
          await page
            .getByRole("button", { name: "Sign in", exact: true })
            .click();
          await removal.waitFor();
          assert.equal(
            await count(),
            1,
            "sign-in must not automatically retry a deletion",
          );
          await removal
            .getByRole("button", { name: "Remove bot post", exact: true })
            .click();
          await page.getByText("Bot post removed.", { exact: true }).waitFor();
          assert.equal(await count(), 0);
          await page
            .getByRole("button", { name: "Sign out", exact: true })
            .waitFor();
          await page
            .getByRole("button", { name: "Remove bot post", exact: true })
            .click();
          await removal
            .getByRole("button", { name: "Remove bot post", exact: true })
            .click();
          await page
            .getByText("This bot post is already removed or unavailable.", {
              exact: true,
            })
            .waitFor();
          const collection = editor.getByRole("combobox", { name: "Story collection" });
          if (await collection.evaluate(element => element.tagName === "SELECT")) await collection.selectOption(SOURCE);
          else {
            await collection.click();
            await page.getByRole("option", { name: "500 Pinoy horror stories", exact: true }).click();
          }
          await editor.getByRole("button", { name: "Save settings", exact: true }).click();
          await page.getByText("Settings saved.", { exact: true }).waitFor();
          assert.equal((await db.query("select settings->>'source' as source from app_private.confession_bots")).rows[0].source, SOURCE);
          await editor.getByRole("button", { name: "Preview only", exact: true }).click();
          await page.getByRole("heading", { name: "Fictional draft · unpublished" }).waitFor();
          await page.getByText("To: Short Stories · From: Mixtape Bot (fiction)", { exact: true }).waitFor();
          assert.equal(await count(), 0);
          await page.getByRole("button", { name: "Close preview" }).click();
          assert.deepEqual(errors, []);
        } finally {
          if (browser) await browser.close();
          await new Promise((resolve) => ui.close(resolve));
        }
      },
    );
});

test("generation configuration and content normalization reject malformed inputs", () => {
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, categories: ["unknown"] }),
  );
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, intervalMinutes: 1 }),
  );
  assert.equal(digestContent("Hello, WORLD!"), digestContent("hello world"));
});
