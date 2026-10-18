const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { pg_trgm } = require("@electric-sql/pglite/contrib/pg_trgm");
const { createApp } = require("../app");
const {
  hashDeleteKey,
  generateDeleteKey,
  KEY_PATTERN,
} = require("../utils/delete-key");
const { reporterHash } = require("../utils/report-hash");

const TRACK = "0123456789ABCDEFGHIJKL";
const env = {
  VERCEL: "1",
  SUPABASE_SERVICE_ROLE: "service-test-".repeat(4),
  DELETE_KEY_PEPPER: "pepper-test-".repeat(4),
  REPORT_HASH_SECRET: "report-test-".repeat(4),
  SPOTIFY_CLIENT_ID: "test",
  SPOTIFY_CLIENT_SECRET: "test",
};
const migration = "20261018110837_schema_catch_up.sql";

// Real SQL under the API, with a minimal Supabase query adapter for local tests.
function adapter(db, calls) {
  const identifier = (name) => {
    assert.match(name, /^[a-z_]+$/);
    return `"${name}"`;
  };
  return {
    async rpc(name, params) {
      calls.push({ rpc: name, params });
      try {
        if (["confession_preview", "visible_song_replies"].includes(name)) {
          return {
            data: (
              await db.query(`select * from public.${identifier(name)}($1)`, [
                params.p_id,
              ])
            ).rows,
          };
        }
        if (name === "poke_confession") {
          return {
            data: (
              await db.query("select public.poke_confession($1, $2) as count", [
                params.p_confession_id,
                params.p_amount ?? 1,
              ])
            ).rows[0]?.count,
          };
        }
        if (name === "visible_top_searches")
          return {
            data: (
              await db.query("select * from public.visible_top_searches($1)", [
                params.p_limit,
              ])
            ).rows,
          };
        const args = Object.keys(params)
          .map((key, i) => `${identifier(key)} => $${i + 1}`)
          .join(",");
        return {
          data: (
            await db.query(
              `select public.${identifier(name)}(${args}) as result`,
              Object.values(params),
            )
          ).rows[0].result,
        };
      } catch (error) {
        return { error: { code: error.code } };
      }
    },
    from(table) {
      const state = {
        operation: "select",
        columns: "id",
        filters: [],
        orders: [],
        limit: null,
      };
      const query = {
        select(columns) {
          assert.ok(!columns.includes("*"));
          state.columns = columns;
          return query;
        },
        eq(column, value) {
          state.filters.push([column, "=", value]);
          return query;
        },
        ilike(column, value) {
          state.filters.push([column, "ilike", value]);
          return query;
        },
        gte(column, value) {
          state.filters.push([column, ">=", value]);
          return query;
        },
        order(column, options) {
          state.orders.push(
            `${identifier(column)} ${options.ascending ? "asc" : "desc"}`,
          );
          return query;
        },
        limit(value) {
          state.limit = value;
          return query;
        },
        insert(rows) {
          state.operation = "insert";
          state.rows = rows;
          return query;
        },
        delete() {
          state.operation = "delete";
          return query;
        },
        then(resolve, reject) {
          const execute = async () => {
            try {
              calls.push({
                table,
                operation: state.operation,
                columns: state.columns,
                filters: state.filters,
              });
              let params = [],
                sql;
              if (state.operation === "insert") {
                const row = state.rows[0];
                params = Object.values(row);
                sql = `insert into public.${identifier(table)} (${Object.keys(row).map(identifier)}) values (${params.map((_, i) => `$${i + 1}`)}) returning id`;
              } else {
                sql =
                  state.operation === "delete"
                    ? `delete from public.${identifier(table)}`
                    : `select ${state.columns.split(",").map(identifier)} from public.${identifier(table)}`;
                if (state.filters.length)
                  sql +=
                    " where " +
                    state.filters
                      .map(([column, op, value]) => {
                        params.push(value);
                        return `${identifier(column)} ${op} $${params.length}`;
                      })
                      .join(" and ");
                if (state.orders.length)
                  sql += " order by " + state.orders.join(",");
                if (state.limit !== null) {
                  params.push(state.limit);
                  sql += ` limit $${params.length}`;
                }
              }
              return { data: (await db.query(sql, params)).rows };
            } catch (error) {
              return { error: { code: error.code } };
            }
          };
          return execute().then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test("anonymous features against real Postgres schema and HTTP routes", async (t) => {
  const db = new PGlite({ extensions: { pg_trgm } });
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.confessions (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), recipient_to text not null, sender_from text default 'Anonymous', content text not null, song_name text, artist_name text, album_art text, spotify_url text);`);
  for (const file of [`supabase/migrations/${migration}`])
    await db.exec(readFileSync(join(__dirname, "../..", file), "utf8"));
  // Reapplying the new migration preserves existing rows and definitions.
  await db.exec(
    readFileSync(
      join(__dirname, "../../supabase/migrations", migration),
      "utf8",
    ),
  );
  await db.exec("set role service_role");
  const calls = [],
    tasks = [],
    notifications = [];
  const database = adapter(db, calls);
  const options = {
    env: {
      ...env,
      ADMIN_WEBHOOK_URL: "https://discord.com/api/webhooks/test/test",
    },
    database,
    background: (task) => tasks.push(task),
    getToken: async () => "token",
    spotify: {
      get: async () => ({
        data: {
          id: TRACK,
          name: "Verified song",
          artists: [{ name: "Verified artist" }],
          external_urls: { spotify: `https://open.spotify.com/track/${TRACK}` },
        },
      }),
    },
    webhook: async (url, init) => {
      notifications.push(JSON.parse(init.body));
      throw new Error("offline webhook");
    },
  };
  const server = createApp(options).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, body, ip = "192.0.2.1") => {
    const res = await fetch(origin + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = {
      status: res.status,
      headers: res.headers,
      body: res.headers.get("content-type").includes("text/html")
        ? await res.text()
        : await res.json(),
    };
    if (typeof result.body === "object")
      assert.ok(
        !/delete_key_hash|reporter_hash|p_key/.test(
          JSON.stringify(result.body),
        ),
        "public response leaked hash fields",
      );
    return result;
  };
  const reset = async () => {
    await db.exec(
      "reset role; truncate public.confessions, public.search_terms, app_private.api_rate_limits cascade; set role service_role",
    );
    calls.length = 0;
    tasks.length = 0;
    notifications.length = 0;
  };
  const post = async (allowReplies = true) => {
    const result = await request("/api/confess", {
      to: "Private Recipient",
      content: "Secret body must never appear in OG or webhooks",
      song: { id: TRACK, name: "Forged" },
      allowReplies,
    });
    assert.equal(result.status, 200);
    const row = (
      await db.query(
        "select id,delete_key_hash from public.confessions order by created_at desc limit 1",
      )
    ).rows[0];
    return { ...row, key: result.body.deleteKey };
  };

  await t.test(
    "one-time keys, validation, generic rejection, legacy keys, and cascade deletion",
    async () => {
      await reset();
      const row = await post();
      assert.match(row.key, KEY_PATTERN);
      assert.equal(
        row.delete_key_hash,
        hashDeleteKey(row.key, env.DELETE_KEY_PEPPER),
      );
      assert.notEqual(row.key, row.delete_key_hash);
      const feed = await request("/api/confessions");
      assert.equal(feed.body.length, 1);
      assert.ok(!JSON.stringify(feed.body).includes(row.key));
      assert.equal(
        (
          await request(`/api/confessions/${row.id}/delete`, {
            key: generateDeleteKey(),
          })
        ).status,
        403,
      );
      assert.equal(
        (await request("/api/confessions/bad/delete", { key: row.key })).status,
        400,
      );
      assert.equal(
        (await request(`/api/confessions/${row.id}/delete`, { key: "bad" }))
          .status,
        400,
      );
      const legacy = (
        await db.query(
          "insert into public.confessions(recipient_to,content) values('Legacy','old') returning id",
        )
      ).rows[0].id;
      assert.equal(
        (await request(`/api/confessions/${legacy}/delete`, { key: row.key }))
          .body.error,
        "That key doesn't match.",
      );
      assert.equal(
        (
          await request(`/api/confessions/${row.id}/replies`, {
            song: { id: TRACK },
            note: "hello",
          })
        ).status,
        200,
      );
      await request("/api/reports", {
        targetType: "confession",
        targetId: row.id,
        reason: "spam",
      });
      assert.equal(
        (await request(`/api/confessions/${row.id}/delete`, { key: row.key }))
          .status,
        200,
      );
      assert.equal(
        (await db.query("select count(*)::int as n from public.replies"))
          .rows[0].n,
        0,
      );
      assert.equal(
        (await db.query("select count(*)::int as n from public.reports"))
          .rows[0].n,
        0,
      );
      assert.deepEqual(
        (await request(`/api/confessions?id=${row.id}`)).body,
        [],
      );
    },
  );

  await t.test(
    "strict shared delete quotas and global author cap",
    async () => {
      await reset();
      const row = await post();
      for (let i = 0; i < 5; i++)
        assert.equal(
          (
            await request(
              `/api/confessions/${i % 2 ? row.id : row.id.toUpperCase()}/author`,
              { key: generateDeleteKey() },
            )
          ).status,
          403,
        );
      assert.equal(
        (await request(`/api/confessions/${row.id}/delete`, { key: row.key }))
          .status,
        429,
      );
      for (let i = 0; i < 10; i++)
        await request(
          `/api/confessions/00000000-0000-4000-8000-${String(i).padStart(12, "0")}/author`,
          { key: row.key },
        );
      assert.equal(
        (await request(`/api/confessions/${row.id}/author`, { key: row.key }))
          .status,
        429,
      );
    },
  );

  await t.test(
    "atomic report deduplication, urgent review, hiding across every read and safe webhook",
    async () => {
      await reset();
      const row = await post();
      await db.exec(
        "insert into public.search_terms(term,hits) values('private',5)",
      );
      assert.equal((await request("/api/top-searches")).body.length, 1);
      const report = (reason, ip) =>
        request(
          "/api/reports",
          {
            targetType: "confession",
            targetId: row.id,
            reason,
            details: "optional",
          },
          ip,
        );
      await report("names_me", "192.0.2.2");
      await report("names_me", "192.0.2.2");
      assert.deepEqual(
        (
          await db.query(
            "select is_hidden,needs_review from public.confessions",
          )
        ).rows[0],
        { is_hidden: false, needs_review: true },
      );
      assert.equal(
        (await db.query("select count(*)::int as n from public.reports"))
          .rows[0].n,
        1,
      );
      await Promise.all([
        report("spam", "192.0.2.3"),
        report("spam", "192.0.2.4"),
      ]);
      await Promise.all(tasks);
      assert.equal(
        (await db.query("select is_hidden from public.confessions")).rows[0]
          .is_hidden,
        true,
      );
      for (const path of [
        "/api/confessions",
        "/api/confessions?to=Private",
        `/api/confessions?id=${row.id}`,
        "/api/top-searches",
      ])
        assert.deepEqual((await request(path)).body, []);
      assert.equal(
        (await request(`/api/confessions/${row.id}/replies`)).status,
        404,
      );
      const og = await request(`/api/og/confessions/${row.id}`);
      assert.equal(og.status, 200);
      assert.match(og.body, /noindex/);
      assert.ok(!og.body.includes("Private Recipient"));
      assert.ok(!og.body.includes("Secret body"));
      assert.ok(notifications.length >= 1);
      assert.ok(!JSON.stringify(notifications).includes("Private Recipient"));
      assert.ok(!JSON.stringify(notifications).includes("Secret body"));
      assert.equal(
        (
          await request("/api/reports", {
            targetType: "confession",
            targetId: "bad",
            reason: "spam",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/api/reports", {
            targetType: "reply",
            targetId: row.id,
            reason: "unknown",
          })
        ).status,
        400,
      );
      const hash = (
        await db.query("select reporter_hash from public.reports limit 1")
      ).rows[0].reporter_hash;
      assert.match(hash, /^[a-f0-9]{64}$/);
      assert.ok(!hash.includes("192.0.2"));
    },
  );

  await t.test("report quotas apply even to duplicate votes", async () => {
    await reset();
    const row = await post();
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await request(
            "/api/reports",
            { targetType: "confession", targetId: row.id, reason: "spam" },
            "192.0.2.2",
          )
        ).status,
        200,
      );
    const blocked = await request(
      "/api/reports",
      { targetType: "confession", targetId: row.id, reason: "spam" },
      "192.0.2.2",
    );
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get("retry-after"));
    assert.equal(
      (await db.query("select count(*)::int as n from public.reports")).rows[0]
        .n,
      1,
    );
  });

  await t.test(
    "reply validation, verification, quotas, caps, parent settings and author removal",
    async () => {
      await reset();
      const row = await post();
      const route = `/api/confessions/${row.id}/replies`;
      assert.equal((await request(route, { song: { id: "bad" } })).status, 400);
      assert.equal(
        (await request(route, { song: { id: TRACK }, note: "x".repeat(141) }))
          .status,
        400,
      );
      // Invalid attempts consumed quotas as abuse prevention; use a fresh client.
      assert.equal(
        (
          await request(
            route,
            { song: { id: TRACK, name: "Forged" }, note: " hello " },
            "192.0.2.2",
          )
        ).status,
        200,
      );
      const replies = await request(route);
      assert.equal(replies.body[0].song_name, "Verified song");
      assert.equal(replies.body[0].note, "hello");
      const replyId = replies.body[0].id;
      await request(
        "/api/reports",
        { targetType: "reply", targetId: replyId, reason: "spam" },
        "192.0.2.9",
      );
      assert.equal(
        (
          await request(
            `/api/confessions/${row.id}/replies/${replyId}/delete`,
            { key: row.key },
          )
        ).status,
        200,
      );
      assert.equal(
        (await db.query("select count(*)::int as n from public.reports"))
          .rows[0].n,
        0,
      );
      assert.deepEqual((await request(route)).body, []);
      for (let i = 0; i < 3; i++)
        assert.equal(
          (await request(route, { song: { id: TRACK } }, "192.0.2.3")).status,
          200,
        );
      assert.equal(
        (await request(route, { song: { id: TRACK } }, "192.0.2.3")).status,
        429,
      );
      const track = {
        song_name: "Verified song",
        artist_name: "Artist",
        spotify_track_id: TRACK,
      };
      await Promise.all(
        Array.from({ length: 25 }, () =>
          database.rpc("add_song_reply", {
            p_parent: row.id,
            p_track: track,
            p_note: null,
            p_cap: 20,
          }),
        ),
      );
      assert.equal(
        (await db.query("select count(*)::int as n from public.replies"))
          .rows[0].n,
        20,
      );
      assert.equal(
        (await request(route, { song: { id: TRACK } }, "192.0.2.4")).status,
        409,
      );
      await db.query(
        "update public.confessions set allow_replies=false where id=$1",
        [row.id],
      );
      assert.equal(
        (await request(route, { song: { id: TRACK } }, "192.0.2.5")).status,
        409,
      );
      assert.deepEqual((await request(route)).body, []);
      await db.query(
        "update public.confessions set is_hidden=true where id=$1",
        [row.id],
      );
      assert.equal(
        (await request(route, { song: { id: TRACK } }, "192.0.2.6")).status,
        404,
      );
      assert.equal(
        calls.some((call) => call.rpc === "increment_search_term"),
        false,
      );
    },
  );

  await t.test(
    "missing or reused secrets fail only affected features, and unverified replies cannot insert",
    async () => {
      await reset();
      const row = await post();
      const pepper = options.env.DELETE_KEY_PEPPER,
        reportSecret = options.env.REPORT_HASH_SECRET;
      try {
        delete options.env.DELETE_KEY_PEPPER;
        assert.equal(
          (
            await request("/api/confess", {
              to: "Test",
              content: "Hi",
              song: { id: TRACK },
            })
          ).status,
          503,
        );
        assert.equal(
          (await request(`/api/confessions/${row.id}/delete`, { key: row.key }))
            .status,
          503,
        );
        assert.equal((await request("/api/confessions")).status, 200);
        options.env.DELETE_KEY_PEPPER = pepper;
        options.env.REPORT_HASH_SECRET = pepper;
        assert.equal(
          (
            await request("/api/reports", {
              targetType: "confession",
              targetId: row.id,
              reason: "spam",
            })
          ).status,
          503,
        );
        delete options.env.REPORT_HASH_SECRET;
        assert.equal(
          (
            await request("/api/reports", {
              targetType: "confession",
              targetId: row.id,
              reason: "spam",
            })
          ).status,
          503,
        );
      } finally {
        options.env.DELETE_KEY_PEPPER = pepper;
        options.env.REPORT_HASH_SECRET = reportSecret;
      }
      const verify = options.spotify.get;
      try {
        options.spotify.get = async () => {
          throw new Error("Spotify offline");
        };
        assert.equal(
          (
            await request(`/api/confessions/${row.id}/replies`, {
              song: { id: TRACK },
            })
          ).status,
          503,
        );
        assert.equal(
          (await db.query("select count(*)::int as n from public.replies"))
            .rows[0].n,
          0,
        );
      } finally {
        options.spotify.get = verify;
      }
    },
  );

  await t.test(
    "reply reports hide replies, hashes purge without losing counts and RLS denies public access",
    async () => {
      await reset();
      const row = await post();
      await request(`/api/confessions/${row.id}/replies`, {
        song: { id: TRACK },
      });
      const reply = (await request(`/api/confessions/${row.id}/replies`))
        .body[0];
      for (let i = 2; i <= 4; i++)
        await request(
          "/api/reports",
          {
            targetType: "reply",
            targetId: reply.id,
            reason: i === 2 ? "private_info" : "spam",
          },
          `192.0.2.${i}`,
        );
      assert.deepEqual(
        (await request(`/api/confessions/${row.id}/replies`)).body,
        [],
      );
      await db.exec(
        "update public.reports set created_at=now()-interval '15 days'; select public.purge_report_hashes(14)",
      );
      assert.equal(
        (
          await db.query(
            "select count(*)::int as n from public.reports where reporter_hash is not null",
          )
        ).rows[0].n,
        0,
      );
      assert.equal(
        (await db.query("select count(*)::int as n from public.reports"))
          .rows[0].n,
        3,
      );
      await db.exec("set role anon");
      for (const table of ["confessions", "replies", "reports"])
        await assert.rejects(
          db.query(`select id from public.${table}`),
          /permission denied/,
        );
      await assert.rejects(
        db.query("select public.purge_report_hashes(14)"),
        /permission denied/,
      );
      for (const signature of [
        "public.submit_content_report(text,uuid,text,text,text,integer,boolean)",
        "public.add_song_reply(uuid,jsonb,text,integer)",
        "public.visible_top_searches(integer)",
        "public.confession_preview(uuid)",
        "public.visible_song_replies(uuid)",
      ]) {
        const permissions = (
          await db.query(
            "select has_function_privilege('anon',$1,'execute') as a, has_function_privilege('authenticated',$1,'execute') as b",
            [signature],
          )
        ).rows[0];
        assert.deepEqual(permissions, { a: false, b: false });
      }
      await db.exec("reset role");
      const flags = (
        await db.query(
          "select relname,relrowsecurity from pg_class where relname in ('replies','reports')",
        )
      ).rows;
      assert.ok(flags.every((flag) => flag.relrowsecurity));
      await db.exec("set role service_role");
    },
  );

  await t.test(
    "OG escapes untrusted names, omits message and anonymizes even nonurgent reports",
    async () => {
      await reset();
      const row = await post();
      await db.query(
        "update public.confessions set recipient_to=$1 where id=$2",
        ['<script>" & Recipient', row.id],
      );
      const preview = await request(`/api/og/confessions/${row.id}`);
      assert.equal((await request(`/confession/${row.id}`)).status, 200);
      assert.match(preview.body, /&lt;script&gt;&quot; &amp; Recipient/);
      assert.ok(!preview.body.includes("Secret body"));
      assert.match(preview.body, /_spa=1/);
      const crawler = await fetch(`${origin}/confession/${row.id}`, {
        headers: { "User-Agent": "Discordbot/2.0" },
      });
      const crawlerHtml = await crawler.text();
      assert.match(crawlerHtml, /og:title/);
      assert.ok(!crawlerHtml.includes('http-equiv="refresh"'));
      assert.ok(!crawlerHtml.includes("Secret body"));
      await request("/api/reports", {
        targetType: "confession",
        targetId: row.id,
        reason: "spam",
      });
      assert.ok(
        !(await request(`/api/og/confessions/${row.id}`)).body.includes(
          "Recipient",
        ),
      );
      assert.match(
        (
          await request(
            "/api/og/confessions/00000000-0000-4000-8000-000000000000",
          )
        ).body,
        /noindex/,
      );
    },
  );

  await t.test(
    "poke increments by batch amount, supports concurrent bursts without lost increments, validates amount, and rejects hidden/missing",
    async () => {
      await reset();
      const row = await post();

      // 1. Default amount (1)
      const first = await request(`/api/confessions/${row.id}/poke`, {}, "POST");
      assert.equal(first.status, 200);
      assert.deepEqual(first.body, { count: 1 });

      // 2. Explicit amount (5)
      const second = await request(
        `/api/confessions/${row.id}/poke`,
        { amount: 5 },
        "POST",
      );
      assert.equal(second.status, 200);
      assert.deepEqual(second.body, { count: 6 });

      // 3. Concurrent requests do not lose increments
      const burstResults = await Promise.all([
        request(`/api/confessions/${row.id}/poke`, { amount: 10 }, "192.0.2.10"),
        request(`/api/confessions/${row.id}/poke`, { amount: 10 }, "192.0.2.11"),
        request(`/api/confessions/${row.id}/poke`, { amount: 10 }, "192.0.2.12"),
        request(`/api/confessions/${row.id}/poke`, { amount: 10 }, "192.0.2.13"),
      ]);
      assert.ok(burstResults.every((res) => res.status === 200));

      // Feed reflects accumulated count: 6 + 40 = 46
      const feed = await request("/api/confessions");
      assert.equal(feed.status, 200);
      const found = feed.body.find((item) => item.id === row.id);
      assert.equal(found?.poke_count, 46);

      const single = await request(`/api/confessions?id=${row.id}`);
      assert.equal(single.status, 200);
      assert.equal(single.body[0]?.poke_count, 46);

      // 4. Amount validation: integer between 1 and 100
      assert.equal(
        (await request(`/api/confessions/${row.id}/poke`, { amount: 0 }, "POST"))
          .status,
        400,
      );
      assert.equal(
        (
          await request(
            `/api/confessions/${row.id}/poke`,
            { amount: 101 },
            "POST",
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await request(
            `/api/confessions/${row.id}/poke`,
            { amount: "ten" },
            "POST",
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await request(
            `/api/confessions/${row.id}/poke`,
            { amount: 1.5 },
            "POST",
          )
        ).status,
        400,
      );

      // 5. Invalid and missing IDs
      assert.equal(
        (await request("/api/confessions/not-a-uuid/poke", {}, "POST")).status,
        400,
      );
      assert.equal(
        (
          await request(
            "/api/confessions/00000000-0000-4000-8000-000000000000/poke",
            {},
            "POST",
          )
        ).status,
        404,
      );

      // 6. Hidden confessions return 404
      await db.query(
        "update public.confessions set is_hidden = true where id = $1",
        [row.id],
      );
      assert.equal(
        (await request(`/api/confessions/${row.id}/poke`, {}, "POST")).status,
        404,
      );

      // 7. Poking never affects search terms or ranking
      const trends = (
        await db.query("select count(*)::int as count from public.search_terms")
      ).rows[0].count;
      assert.equal(trends, 0);
    },
  );
});

test("delete keys have independent high entropy, and reporter hashes rotate at UTC day boundaries", () => {
  const keys = Array.from({ length: 100 }, generateDeleteKey);
  assert.equal(new Set(keys).size, 100);
  assert.ok(keys.every((key) => KEY_PATTERN.test(key)));
  const first = reporterHash(
    "192.0.2.1",
    env.REPORT_HASH_SECRET,
    new Date("2026-10-18T23:59:59Z"),
  );
  const next = reporterHash(
    "192.0.2.1",
    env.REPORT_HASH_SECRET,
    new Date("2026-10-19T00:00:00Z"),
  );
  assert.notEqual(first, next);
  assert.match(first, /^[a-f0-9]{64}$/);

  assert.notEqual(
    hashDeleteKey(keys[0], env.DELETE_KEY_PEPPER),
    hashDeleteKey(keys[0], env.REPORT_HASH_SECRET),
  );
});
