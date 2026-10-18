const { join } = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const columns = {
  confessions: [
    "id",
    "created_at",
    "recipient_to",
    "sender_from",
    "content",
    "song_name",
    "artist_name",
    "album_art",
    "spotify_url",
    "delete_key_hash",
    "allow_replies",
    "is_hidden",
    "needs_review",
    "poke_count",
  ],
  search_terms: ["term", "hits", "last_searched"],
  replies: [
    "id",
    "confession_id",
    "song_name",
    "artist_name",
    "album_art",
    "spotify_url",
    "spotify_track_id",
    "note",
    "is_hidden",
    "needs_review",
    "created_at",
  ],
  reports: [
    "id",
    "target_type",
    "target_id",
    "confession_id",
    "reply_id",
    "reason",
    "details",
    "reporter_hash",
    "created_at",
  ],
};
const privateColumns = ["key", "hits", "expires_at"];
const functions = [
  {
    name: "consume_api_rate_limit",
    args: { p_key: "", p_window_seconds: 0, p_limit: 0 },
    expected: "Invalid rate-limit parameters",
  },
  { name: "increment_search_term", args: { p_term: "" } },
  {
    name: "submit_content_report",
    args: {
      p_target_type: "confession",
      p_target_id: "not-a-uuid",
      p_reason: "other",
      p_details: "",
      p_reporter_hash: "",
      p_threshold: 0,
      p_urgent: false,
    },
    expected: "22P02",
  },
  {
    name: "add_song_reply",
    args: { p_parent: "not-a-uuid", p_track: "{}", p_note: "", p_cap: 0 },
    expected: "22P02",
  },
  { name: "visible_top_searches", args: { p_limit: 1 } },
  {
    name: "confession_preview",
    args: { p_id: "not-a-uuid" },
    expected: "22P02",
  },
  {
    name: "visible_song_replies",
    args: { p_id: "not-a-uuid" },
    expected: "22P02",
  },
  {
    name: "purge_report_hashes",
    args: { p_days: 0 },
    expected: "Invalid retention",
  },
  {
    name: "poke_confession",
    args: { p_confession_id: "not-a-uuid", p_amount: 1 },
    expected: "22P02",
  },
];

async function checkSchema(database, output = console.log) {
  let failed = 0,
    passed = 0;
  const probe = async (name, execute, expected) => {
    try {
      const { error } = await execute();
      const valid =
        !error ||
        (error.code === "P0001" && error.message === expected) ||
        (error.code === "22P02" && expected === "22P02");
      if (valid) {
        passed++;
        output(
          `PASS ${name}${error ? " (expected validation rejection; no writes)" : ""}`,
        );
      } else {
        failed++;
        const code = /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(error.code)
          ? error.code
          : "upstream";
        output(`FAIL ${name} code=${code}`);
      }
    } catch {
      failed++;
      output(`FAIL ${name} code=connection_or_client_error`);
    }
  };
  for (const [table, names] of Object.entries(columns)) {
    for (const name of names)
      await probe(`public.${table}.${name}`, () =>
        database.from(table).select(name).limit(1),
      );
  }
  for (const name of privateColumns) {
    await probe(`app_private.api_rate_limits.${name}`, () =>
      database.rpc(
        "check_rate_limit_column",
        { p_column: name },
        { get: true },
      ),
    );
  }
  for (const fn of functions) {
    // GET RPCs run in a read-only PostgREST transaction. Even an older function
    // missing its input guard cannot commit writes. Never probe with a real id,
    // search term, key, or reporter hash, and never print returned data.
    await probe(
      `rpc public.${fn.name}`,
      () => database.rpc(fn.name, fn.args, { get: true }),
      fn.expected,
    );
  }
  output(`Schema check: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

async function main() {
  require("dotenv").config({ path: join(__dirname, "../.env"), quiet: true });
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE: key } = process.env;
  if (!url || !key) {
    console.error(
      "FAIL configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE are required in server/.env or the process environment.",
    );
    process.exitCode = 1;
    return;
  }
  try {
    const parsed = new URL(url);
    // Only the hostname: never credentials, query strings, keys, or row data.
    console.log(`Schema target: ${parsed.hostname}`);
    const database = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (address, options = {}) =>
          fetch(address, { ...options, signal: AbortSignal.timeout(8000) }),
      },
    });
    const { failed } = await checkSchema(database);
    if (failed) process.exitCode = 1;
  } catch {
    console.error(
      "FAIL configuration or connection: check server/.env and Supabase availability.",
    );
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
module.exports = { checkSchema, columns, privateColumns, functions };
