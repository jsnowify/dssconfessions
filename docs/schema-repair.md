# Database schema repair

## Live application completed

On 2026-10-18, after explicit user authorization, `schema_catch_up` was applied
successfully to **dssconfessions** (`zmblwehfnnsozjhbrlwr`). The live checker now
reports **47 passed, 0 failed**. All 56 existing confessions remain; an aggregate
checksum of their nine original columns is identical before/after, and all 56
received the safe legacy defaults. Production health and feed return HTTP 200;
the feed exposes no author/reporter hash fields. LSMS was not modified.

Security advisors report no warnings/errors, only the expected informational
[RLS without policies notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
for service-only tables. No public policies were added. New secrets, cleanup cron,
and deployment of local code remain separate setup tasks. The investigation and
manual-run instructions below describe the state before this authorized application;
you no longer need to apply the catch-up SQL yourself.

Verified against live **dssconfessions** (`zmblwehfnnsozjhbrlwr`) on 2026-10-18
using read-only catalog queries and the service-role REST client. No production
schema, data, or environment variables were changed. Do not run this on LSMS.

## Root cause

The new code filters every confession read with `.eq("is_hidden", false)`, but
**public.confessions.is_hidden does not exist** in the live database. The other
three feature columns, all three feature/trending tables, and seven related
functions are also absent. This is a real missing schema, not just a stale cache.
The previous log printed only `42703`, hiding the useful column name.

Live migration history contains only `20261018080243` (serverless rate limits)
and `20261018080247` (confession indexes). SQL Editor runs do not necessarily
create history entries, so actual catalogs were inspected too: they agree.
There is no tracked history for the newer SQL files from which to prove that
a previously applied version was edited.

An ordering trap is now reproduced in a test: running the old anonymous-feature
SQL before `trending-searches.sql` fails when `visible_top_searches` references
the missing `search_terms` table. The transaction rolls back, including all four
confession columns. This is a possible explanation for an unsuccessful manual
run, not a claim that you definitely ran it in that order.

## Expected vs migration vs actual

All objects below are in `public` except the private limiter table.

| Code expects | Original SQL source | Live finding before repair |
| --- | --- | --- |
| `confessions.id,created_at,recipient_to,sender_from,content,song_name,artist_name,album_art,spotify_url` | Original manually created schema; older migrations assume it exists | All nine present, correct snake_case names/types |
| `confessions.delete_key_hash` nullable text | Anonymous features | Missing (`42703`) |
| `confessions.allow_replies` boolean default true | Anonymous features | Missing (`42703`) |
| `confessions.is_hidden` boolean default false | Anonymous features | Missing (`42703`), breaks all filtered reads |
| `confessions.needs_review` boolean default false | Anonymous features | Missing (`42703`) |
| `search_terms.term,hits,last_searched` | Trending SQL | Table absent (`PGRST205` / SQL `42P01`) |
| `replies.id,confession_id,song_name,artist_name,album_art,spotify_url,spotify_track_id,note,is_hidden,needs_review,created_at` | Anonymous features | Table absent |
| `reports.id,target_type,target_id,confession_id,reply_id,reason,details,reporter_hash,created_at` | Anonymous features | Table absent |
| `app_private.api_rate_limits.key,hits,expires_at` | Serverless rate limits | Present, correctly private, RLS enabled |
| `consume_api_rate_limit(text,integer,integer)` -> jsonb | Serverless rate limits | Present, correct signature |
| `increment_search_term(text)` -> void | Trending SQL | Missing (`PGRST202`) |
| `submit_content_report(text,uuid,text,text,text,integer,boolean)` -> jsonb | Anonymous features | Missing |
| `add_song_reply(uuid,jsonb,text,integer)` -> text | Anonymous features | Missing |
| `visible_top_searches(integer)` -> table(term text,hits integer) | Anonymous features | Missing |
| `confession_preview(uuid)` -> table(recipient_to text) | Anonymous features | Missing |
| `visible_song_replies(uuid)` -> nine public reply columns | Anonymous features | Missing |
| `purge_report_hashes(integer)` -> integer | Anonymous features / cleanup | Missing |
| `check_rate_limit_column(text)` -> boolean | New catch-up SQL | New checker helper; not an old API dependency |

No typo or wrong schema was found. `allowReplies` is intentionally the HTTP
field, while `allow_replies` is the DB column. Likewise, the API maps `to` and
`from` to `recipient_to` and `sender_from`. `album_art` is consistent. The repair
adds missing schema instead of renaming correct code fields.

### Every application DB call

| Location | Query |
| --- | --- |
| `server/app.js`, health | Select `confessions.id`, filter `is_hidden=false`, limit 1; guarded legacy fallback |
| `server/app.js`, post | Insert `recipient_to,sender_from,content,song_name,artist_name,album_art,spotify_url,allow_replies,delete_key_hash`; defaults supply id/date/visibility |
| `server/app.js`, feed/browse/single | Select the nine public confession columns explicitly; filter `is_hidden=false`; lookup `id`; browse `ilike(recipient_to)`; order descending `created_at`; limits 1/50/20 |
| `server/utils/visible-confessions.js` | On missing `is_hidden`, probe `reports.id` with limit 1 before permitting a legacy core read |
| `server/app.js`, trends | RPC `visible_top_searches(p_limit)` |
| `server/features.js`, author | Select `confessions.delete_key_hash`, filter `id`, limit 1; compare internally; return success/denial only |
| `server/features.js`, parent/settings | Select `confessions.id,allow_replies`, filter `id,is_hidden`, limit 1 |
| `server/features.js`, delete | Delete `confessions` by `id`, or `replies` by `id,confession_id` |
| `server/features.js`, replies/reports | RPCs `visible_song_replies`, `add_song_reply`, `submit_content_report` |
| `server/og.js` | RPC `confession_preview(p_id)`; no message/hash projection |
| `server/utils/rate-limit.js` | RPC `consume_api_rate_limit(p_key,p_window_seconds,p_limit)`; HMAC client key only |
| `server/utils/search-trends.js` | Shared limiter RPC, then background `increment_search_term(p_term)` |
| `api/index.js`, `server/vercel.js`, `server/index.js` | Entrypoint/wiring only; no independent DB queries |

There are no SDK `.select('*')`, direct SDK `.update()`, or `.filter()` calls in
application code. Internal SQL `%rowtype`/`select *` records support reply caps
and limiter bookkeeping; they are never returned by public endpoints. Public
confession and reply projections omit `delete_key_hash` and `reporter_hash`.

### Migration inventory in dependency order

| File | Objects and security |
| --- | --- |
| `20261018080243_serverless_rate_limits.sql` | `app_private` schema; `api_rate_limits(key text PK,hits int,expires_at timestamptz)`; key-length/hits checks; `api_rate_limits_expiry_idx`; `consume_api_rate_limit`; RLS, no public grants/policies, service-only execution. Original table/index/function creation is **not re-runnable**. |
| `20261018080247_confession_indexes.sql` | `confessions_created_at_idx`; `pg_trgm`; `confessions_recipient_trgm_idx` GIN index |
| `supabase/trending-searches.sql` (unversioned prerequisite) | `search_terms` and its three columns; PK, term-length/nonnegative-hit checks; `search_terms_popular_idx`; `increment_search_term`; RLS and service-only grants |
| `20261018100410_anonymous_features.sql` | Four confession columns; replies/reports with the columns above; cascade FKs; report dedup unique constraint; target-consistency, reason, details, hash, track-id and note checks; seven feature indexes; six feature RPCs; RLS and service-only grants |
| `20261018110837_schema_catch_up.sql` | All objects above, missing base tables/columns, safe flag defaults, guarded constraints, idempotent indexes/RPC replacements, private-column checker helper and final schema-cache reload |

The six feature RPCs are `submit_content_report`, `add_song_reply`,
`visible_top_searches`, `confession_preview`, `visible_song_replies`, and
`purge_report_hashes`. Feature indexes are `confessions_visible_created_idx`,
`replies_parent_created_idx`, `replies_visible_parent_idx`, `reports_target_idx`,
`reports_confession_idx`, `reports_reply_idx`, and `reports_hash_expiry_idx`.
Original PK indexes and the legacy `idx_recipient_search` btree are retained.
The created-at/GIN and limiter expiry indexes are present live; feature/trending
indexes are absent. All five application tables have RLS after repair; no public
policies or public role grants are added. RPCs remain SECURITY INVOKER with a
fixed search path and service-only execution.

## Project/environment comparison

| Source | Finding |
| --- | --- |
| Local `server/.env` | `zmblwehfnnsozjhbrlwr.supabase.co`; service-role variable present |
| Vercel dssconfessions, Production + Preview | Same hostname, independently read through authenticated CLI; four original variables present |
| `server/.env.example` | `your-project.supabase.co` is an intentional placeholder |
| `docs/operations.md` / Vercel link | Same intended project; the “inactive” observation is historical and followed by a completed restoration entry |
| `DELETE_KEY_PEPPER`, `REPORT_HASH_SECRET` | Missing locally and in checked Vercel Production/Preview metadata |
| Supabase Cron | `pg_cron` is not installed in this project |

No wrong-project URL was found. No keys/encrypted values, row contents, names or
IPs were printed or committed. No `.env` contents were changed. The Vercel app
connector could not access the team; authenticated CLI read-only checks succeeded.

## Run one repair file

1. Open [dssconfessions SQL Editor](https://supabase.com/dashboard/project/zmblwehfnnsozjhbrlwr/sql/new).
2. Paste and run the **entire**
   [`20261018110837_schema_catch_up.sql`](../supabase/migrations/20261018110837_schema_catch_up.sql).
3. Wait for success, then run the checker below. The file ends with
   `notify pgrst, 'reload schema';`. If a cache-only failure appears immediately
   after success, wait a few seconds and retry once.

**No other schema migration or trending SQL is needed. Do not rerun the original
non-idempotent limiter migration.** This transaction does not drop tables/columns,
truncate or delete rows, or invoke mutation/purge functions. Existing content,
author hashes, moderation flags and counters survive. New flags default to
visible/not under review/replies enabled; author keys default null. Existing null
flags receive the same defaults, and null search counts become zero. Existing
non-null values remain unchanged. An older mandatory reporter hash is made
nullable for retention; existing hashes are not erased by the migration.

Legacy, partial and current compatible schemas are supported. If an independently
edited schema has incompatible types/function return types, duplicate keys,
orphaned FKs or missing required historic data, the transaction safely fails
instead of deleting/fabricating data. Preserve the SQL error for a specific
repair; do not drop/recreate a populated table to force it through.

## Run the checker

From the repository root:

```powershell
npm run check:schema --prefix server
```

From `server`, use `npm run check:schema`. It loads `server/.env`, honors process
environment overrides, and prints the target hostname. Each of 36 public
columns gets `select(column).limit(1)`, without printing results. Three private
limiter columns use the new service-only boolean probe: **do not expose
app_private** in the API. Eight required RPC signatures use GET/read-only
transactions and empty/invalid inputs. Expected type/validation rejections count
as PASS; no mutation can commit, even if an older function lacks its guard.

Success ends with:

```text
Schema check: 47 passed, 0 failed.
```

Exit 0 means all probes passed; any failure exits 1:

| Error | Meaning |
| --- | --- |
| `42703` | Missing DB column |
| `42P01` | Missing DB table/relation |
| `PGRST204` / `PGRST205` | Column/table absent from PostgREST schema cache |
| `PGRST202` | Missing/incompatible/unrefreshed RPC signature |
| `42501` | Wrong role/key or missing grants |
| `connection_or_client_error` / `upstream` | Check availability and configuration privately |

The live pre-repair run reported **10 passed, 37 failed**. Three failures are the
not-yet-installed private probe RPC, not missing limiter columns; the catalogs
confirm those columns exist. A caught-up local Postgres database passes 47/0.
The live post-migration result is pending your SQL Editor run; this migration
has intentionally not been applied remotely on your behalf.

## Logging and graceful reads

All app Supabase table/RPC calls are instrumented, including health, background
trending and quota calls. Logs include a static route template, target/action,
and JSON `code`, `message`, `details`, `hint` fields. Concrete request URLs,
query values, bodies, SQL parameters, headers and rows are never logged.

```text
[db GET /api/confessions confessions select] {"code":"42703","message":"column confessions.is_hidden does not exist","details":null,"hint":null}
[db core-read] Missing public.confessions.is_hidden; run npm run check:schema --prefix server and apply the schema catch-up migration.
```

Structural schema diagnostics are retained; data-bearing/unrecognized fields are
redacted. Raw DB errors can contain whole rejected rows, names or keys in
constraint diagnostics, so dumping error objects would violate privacy. Client
responses remain clean generic 503 JSON with no DB internals.

Only a specifically missing `is_hidden` enables a legacy read retry, and only
after reports are proven absent/empty. Existing reports, ambiguous responses,
other missing core columns, permissions and network errors retain fail-closed
503 behavior. Migrated reads always use `is_hidden=false` and remain uncached.
Missing optional tables do not affect core reads when visibility works. Posting
and safety features stay unavailable until their schema/secrets are ready;
shared quotas and author verification are never bypassed.

## Verification and manual actions

- 35 backend tests pass, including real-Postgres/HTTP tests for posting, one-time
  keys, reporting/auto-hide, replies/removal/caps, trending visibility and OG privacy.
- Feature tests now apply the consolidated SQL twice. Separate tests cover the
  original ordering rollback, partial tables, old feature SQL, repeat runs,
  preserved messages/hashes/moderation, 47/0 probes and public-role access denial.
- Mocked 42703 tests verify all four diagnostic fields and the route prefix,
  generic client 503, and redaction of row text, recipient values, key-like
  values and IPs. The checker never prints returned data.
- Against the real DB through the patched local API: feed 200 (20 returned rows),
  Browse 200, single lookup 200, health 200, no private hash fields returned.
  This verification disabled background mutations; no production test rows were written.
- Client lint/build pass. Frontend files, fonts, visuals, routes, response shapes,
  history/search handlers and environment-file contents were unchanged by this task.

Remaining steps:

1. Run the one catch-up SQL file and rerun the checker.
2. Configure two different independent server-only secrets of at least 32
   characters: `DELETE_KEY_PEPPER` and `REPORT_HASH_SECRET`, locally and for each
   deployed Vercel environment. Do not reuse the service-role key or each other.
   Do not casually rotate a pepper already used for author keys. No secret was
   generated, printed or changed here.
3. Restart local Express after setting variables, and deploy the patched backend
   after Vercel setup. Neither was restarted/deployed automatically.
4. To meet hash-retention promises, enable Supabase Cron and run the hourly
   [cleanup scheduling SQL](features.md#required-scheduled-hash-cleanup).
   **This is additional operational SQL**, separate from schema repair, required
   before relying on physical hash cleanup. It is not needed to restore reads.
5. After SQL/secrets/deployment, deliberately test post/delete/reply/report flows
   using your own test confession. No production confession or report was created,
   hidden or deleted during this investigation.

Missing-secret endpoints cannot succeed from SQL repair alone. Posting, trends,
reports and replies are not claimed fixed live before your SQL/configuration/
deployment steps; their post-repair behavior passes local Postgres/HTTP tests.

## Files

Changed: `server/app.js`, `server/package.json`, `server/test/features.test.js`,
`docs/features.md`, `docs/trending-searches.md`.

Created: `server/utils/database-diagnostics.js`,
`server/utils/visible-confessions.js`, `server/scripts/check-schema.js`,
`server/test/schema.test.js`,
`supabase/migrations/20261018110837_schema_catch_up.sql`, and this report.
Older migration files remain intact; no secrets or environment files are changed.

References: [schema reload](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema),
[API grants and read-only GET requests](https://supabase.com/docs/guides/api/securing-your-api).
