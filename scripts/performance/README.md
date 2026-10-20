# API latency checks

`npm run perf:feed -- before` captures the existing implementation before edits.
`npm run perf:feed -- after` measures the current implementation. Results are in
the ignored `performance-results/feed-before.json` and `feed-after.json` files.
The script uses 5,000 fictional rows in disposable PGlite databases. It never
loads environment files or contacts the live site. It measures warm sequential
requests both without a network delay and with a simulated 20 ms delay per
database call. These are controlled comparisons, not production latency or
capacity estimates.

The feed uses `read_confession_feed` to consume the existing shared read quota
and select the public page in one transaction. The public response remains an
array; hidden confessions and hidden replies are filtered on every request.
Apply `supabase/migrations/20261020014012_optimized_confession_feed.sql`, then run
`npm run check:schema --prefix server` before deploying the API. An older database
falls back to the previous quota-then-select path without losing moderation or
charging the quota twice. Permission failures still return 503.

The configured function region is Sydney (`syd1`) because the connected Supabase
project was verified in Sydney (`ap-southeast-2`) on October 20, 2026. Keep the
function close to the database. Revisit this setting if the database moves; a
shorter browser-to-function route alone does not account for database round trips.
Static assets continue to use Vercel's CDN. The region change requires a redeploy;
its effect on total response time must be measured from the actual deployment.

API responses expose numeric `Server-Timing` entries for Express handling time
(`app`), completed database-call time (`db`), and the number of started database
calls (`db_calls`). They contain no request values, keys, identifiers, or search
terms. Background operations may overlap; their total database duration is not
a breakdown of active CPU time. `app` excludes function startup and the client's
network latency. Compare it with browser TTFB to distinguish server work from
transport and cold starts.
