const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { once } = require("node:events");
const { PGlite } = require("@electric-sql/pglite");
const { pg_trgm } = require("@electric-sql/pglite/contrib/pg_trgm");
const { createApp } = require("../app");
const {
  hashAdminPassword,
  createAdminSession,
  COOKIE,
} = require("../bots/admin-auth");
const { adapter } = require("../test-support/database.cjs");

const OWNER_PASSWORD = "super-secret-admin-pass";
const TRACK = "4cOdK2wGLETKBW3PvgPWqT";

test("admin moderation API endpoints and controls", async (t) => {
  const env = {
    VERCEL: "1",
    SUPABASE_SERVICE_ROLE: "service-test-".repeat(4),
    DELETE_KEY_PEPPER: "pepper-test-".repeat(4),
    REPORT_HASH_SECRET: "report-test-".repeat(4),
    BOT_ADMIN_PASSWORD_HASH: await hashAdminPassword(OWNER_PASSWORD),
    BOT_ADMIN_SESSION_SECRET: "admin-session-secret-".repeat(3),
    SPOTIFY_CLIENT_ID: "test",
    SPOTIFY_CLIENT_SECRET: "test",
  };

  const db = new PGlite({ extensions: { pg_trgm } });
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.confessions (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), recipient_to text not null, sender_from text default 'Anonymous', content text not null, song_name text, artist_name text, album_art text, spotify_url text);`);

  for (const file of [
    "20261018110837_schema_catch_up.sql",
    "20261018140000_replies_tracklist_cap.sql",
    "20261019024537_confession_bots.sql",
    "20261019034400_bot_disclosure_in_recipient.sql",
    "20261019043830_curated_horror_library.sql",
    "20261019043834_replies_500.sql",
  ]) {
    await db.exec(
      readFileSync(join(__dirname, "../../supabase/migrations", file), "utf8"),
    );
  }
  await db.exec("set role service_role");

  const database = adapter(db, []);
  const options = {
    env,
    database,
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
  };

  const server = createApp(options).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const adminSession = createAdminSession(env);
  const adminCookie = `${COOKIE}=${adminSession}`;

  const request = async (path, body, method = undefined, cookie = adminCookie, csrf = "1") => {
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers.Cookie = cookie;
    if (csrf) headers["X-Admin"] = csrf;
    const res = await fetch(origin + path, {
      method: method || (body === undefined ? "GET" : "POST"),
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, headers: res.headers, body: data };
  };

  // Helper to create a confession
  const createConfession = async (to = "Dr. Augie", content = "Test confession message") => {
    const res = await db.query(
      "insert into public.confessions(recipient_to, sender_from, content, song_name, artist_name, spotify_url) values($1, $2, $3, $4, $5, $6) returning id",
      [to, "Anonymous", content, "Song", "Artist", "https://open.spotify.com"],
    );
    return res.rows[0].id;
  };

  // Helper to create a reply
  const createReply = async (confessionId, note = "Test reply note") => {
    const res = await db.query(
      "insert into public.replies(confession_id, song_name, artist_name, spotify_track_id, note) values($1, $2, $3, $4, $5) returning id",
      [confessionId, "Reply Song", "Reply Artist", TRACK, note],
    );
    return res.rows[0].id;
  };

  await t.test("authentication and CSRF security gates on admin endpoints", async () => {
    // Unauthenticated GET
    const unauth = await request("/api/admin/reports", undefined, "GET", "");
    assert.equal(unauth.status, 401);

    // Bad cookie
    const badCookie = await request("/api/admin/reports", undefined, "GET", "dss_bot_admin=invalid");
    assert.equal(badCookie.status, 401);

    // Missing CSRF on write
    const noCsrf = await request("/api/admin/confessions/00000000-0000-0000-0000-000000000000", { content: "new" }, "PATCH", adminCookie, null);
    assert.equal(noCsrf.status, 403);
  });

  await t.test("GET /api/admin/reports lists reported confessions and replies", async () => {
    const cId = await createConfession("Target Person", "Harassment text");
    const rId = await createReply(cId, "Offensive note");

    // Insert reports
    await db.query(
      "insert into public.reports(target_type, target_id, confession_id, reason, details) values('confession', $1, $1, 'harassment', 'Please take this down')",
      [cId],
    );
    await db.query(
      "insert into public.reports(target_type, target_id, confession_id, reply_id, reason, details) values('reply', $1, $2, $1, 'spam', 'Bot advertisement')",
      [rId, cId],
    );

    const res = await request("/api/admin/reports");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.confessions));
    assert.ok(Array.isArray(res.body.replies));

    const conf = res.body.confessions.find((c) => c.id === cId);
    assert.ok(conf);
    assert.equal(conf.report_count, 1);
    assert.deepEqual(conf.reasons, ["harassment"]);
    assert.equal(conf.reports[0].details, "Please take this down");

    const rep = res.body.replies.find((r) => r.id === rId);
    assert.ok(rep);
    assert.equal(rep.report_count, 1);
    assert.deepEqual(rep.reasons, ["spam"]);
    assert.equal(rep.parent_recipient, "Target Person");
  });

  await t.test("PATCH /api/admin/confessions/:id updates confession fields", async () => {
    const id = await createConfession("Initial Name", "Initial message");

    const updateRes = await request(`/api/admin/confessions/${id}`, {
      recipient_to: "Updated Name",
      sender_from: "Secret Admirer",
      content: "Cleaned message",
      is_hidden: true,
      needs_review: false,
      allow_replies: false,
    }, "PATCH");

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.confession.recipient_to, "Updated Name");
    assert.equal(updateRes.body.confession.sender_from, "Secret Admirer");
    assert.equal(updateRes.body.confession.content, "Cleaned message");
    assert.equal(updateRes.body.confession.is_hidden, true);
    assert.equal(updateRes.body.confession.needs_review, false);
    assert.equal(updateRes.body.confession.allow_replies, false);

    // Verify in db
    const row = (await db.query("select * from public.confessions where id=$1", [id])).rows[0];
    assert.equal(row.recipient_to, "Updated Name");
    assert.equal(row.is_hidden, true);
  });

  await t.test("DELETE /api/admin/confessions/:id deletes confession and cascades to replies & reports", async () => {
    const cId = await createConfession("To Delete", "Delete me");
    const rId = await createReply(cId, "Reply to delete");
    await db.query(
      "insert into public.reports(target_type, target_id, confession_id, reason) values('confession', $1, $1, 'spam')",
      [cId],
    );

    const delRes = await request(`/api/admin/confessions/${cId}`, undefined, "DELETE");
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.deleted, true);

    // Verify confession gone
    const confRow = (await db.query("select count(*)::int as n from public.confessions where id=$1", [cId])).rows[0];
    assert.equal(confRow.n, 0);

    // Verify reply cascaded
    const repRow = (await db.query("select count(*)::int as n from public.replies where id=$1", [rId])).rows[0];
    assert.equal(repRow.n, 0);

    // Verify report cascaded
    const repCount = (await db.query("select count(*)::int as n from public.reports where confession_id=$1", [cId])).rows[0];
    assert.equal(repCount.n, 0);
  });

  await t.test("PATCH /api/admin/replies/:id and DELETE /api/admin/replies/:id", async () => {
    const cId = await createConfession("Parent", "Parent message");
    const rId = await createReply(cId, "Original reply note");

    // Edit
    const patchRes = await request(`/api/admin/replies/${rId}`, {
      note: "Updated reply note",
      is_hidden: true,
      needs_review: false,
    }, "PATCH");
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.reply.note, "Updated reply note");
    assert.equal(patchRes.body.reply.is_hidden, true);

    // Delete
    const delRes = await request(`/api/admin/replies/${rId}`, undefined, "DELETE");
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.deleted, true);

    const remaining = (await db.query("select count(*)::int as n from public.replies where id=$1", [rId])).rows[0];
    assert.equal(remaining.n, 0);
  });

  await t.test("POST /api/admin/reports/dismiss clears reports and unflags needs_review", async () => {
    const cId = await createConfession("Flagged Target", "Flagged text");
    await db.query("update public.confessions set needs_review = true where id = $1", [cId]);
    await db.query(
      "insert into public.reports(target_type, target_id, confession_id, reason) values('confession', $1, $1, 'harassment')",
      [cId],
    );

    const dismissRes = await request("/api/admin/reports/dismiss", {
      targetType: "confession",
      targetId: cId,
    }, "POST");

    assert.equal(dismissRes.status, 200);
    assert.equal(dismissRes.body.dismissed, true);

    // Verify needs_review is false and reports deleted
    const conf = (await db.query("select needs_review from public.confessions where id=$1", [cId])).rows[0];
    assert.equal(conf.needs_review, false);

    const reportsCount = (await db.query("select count(*)::int as n from public.reports where target_id=$1", [cId])).rows[0];
    assert.equal(reportsCount.n, 0);
  });
});

