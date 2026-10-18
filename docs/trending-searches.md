If your database is missing feature columns/tables or you are unsure which SQL
has run, follow [the one-file schema repair](schema-repair.md) and run
`npm run check:schema --prefix server`. It includes all trending prerequisites;
do not rerun the original non-idempotent limiter migration on an initialized DB.

Trending searches use the existing Express API and Supabase service-role client.
The current deployment runs both frontend and API on Vercel; local Express and
Render also work without changing search URLs.

Before deploying, run the complete `supabase/trending-searches.sql` file in the
Supabase SQL Editor. It creates the table, index, atomic increment RPC and
service-role-only permissions. This SQL has not been applied to production.
Install dependencies from the updated server lockfile and deploy both API and
frontend together.

`GET /api/top-searches?limit=8` returns an array such as
`[{"term":"snowi","hits":3}]`. It defaults to eight entries, caps at twenty,
excludes counts below three. Moderation now uses `no-store` instead of the old
sixty-second cache to avoid stale hidden content. The new `visible_top_searches`
RPC requires a visible matching confession; normalization, ranking, thresholds
and background increments are unchanged. See `docs/features.md` for its migration.
Counts are all-time popularity, not a rolling time window. No historical search
data is backfilled, so the normal Browse empty state remains until terms qualify.

Only successful recipient searches with normalized terms of 2–40 characters are
counted. Search matching, existing result limits and other pages are unchanged.
The increment runs without awaiting it; Vercel uses `waitUntil` to keep this
best-effort operation alive after the response. Failed increments are silently
discarded and never block search results.

The ten-minute per-client/per-term cooldown reuses the migration's
`consume_api_rate_limit` RPC and private `app_private.api_rate_limits` table,
with a quota of one and a 600-second TTL. It is shared across instances and
survives cold starts. The existing migration
`supabase/migrations/20261018080243_serverless_rate_limits.sql` must already be
applied; this change requires no new SQL.

The key is an HMAC-SHA256 of a separate trend namespace, normalized term and
normalized client IP, using the server-only service-role secret. Only that opaque
key, quota hits and expiry are stored in the private limiter table; raw IPs and
terms are not sent to that table or logged. IPv6 uses the existing limiter's
subnet normalization. This uses short-lived counters rather than rotating salts:
expiry is enforced atomically after ten minutes, without extending the window on
repeated searches. The existing RPC lazily deletes expired rows older than one
day in batches of 100; TTL expiry is not immediate physical deletion.

Both quota acquisition and counting run in the background via Vercel `waitUntil`.
An exhausted quota, missing secret, store outage, malformed RPC response or
increment failure silently skips counting without affecting the search response.
An increment failure after quota acquisition can lose that count for the current
window; this is deliberately best-effort. Existing general API rate limiting and
its failure behavior are unchanged. The public trend table still stores only the
normalized term, aggregate count and latest search timestamp.

Suggested About page Privacy Guarantee line:

> We only count popular recipient names—not who searched for them; no IP addresses, user IDs, or fingerprints are stored with these counts.
