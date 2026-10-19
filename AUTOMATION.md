# Automated fictional confessions

The bot controls live at `/admin/bots`. This is an administrator-only creative-writing feature, separate from the anonymous student submission form. No public accounts, student identities, or visitor tracking were added. The page and its APIs are excluded from indexing.

## Existing flow and integration

The Vite/React SPA uses the custom History API router in `client/src/App.jsx`. `useConfessions` posts to Express `POST /api/confess`, which enforces a shared PostgreSQL quota, validates the recipient/message/Spotify track ID, verifies track metadata with Spotify, creates a private author Delete Key, and inserts into `public.confessions`. The feed selects only public fields and filters hidden posts. Reports, author controls, Pokes, song replies, and the ten-reply cap retain their existing endpoints and behavior.

Both humans and bots now use `server/services/confession-submission.js` for the same input validation, Spotify verification, author-key hashing, and row construction. Bots use an atomic persistence RPC so saving the confession, completing its job, and incrementing its bot count either all commit or all roll back. There is no HTTP call to the site's own public URL, no impersonated user, and no bypass of a human's quota. All bots share the existing 15 submissions per 15 minutes policy under a dedicated synthetic client key. Public callers cannot set the internal automation context or `is_automated` flag.

Generated posts always use recipient **A fictional listener**, sender **Mixtape Bot (fiction)**, an **Automated fiction** text prefix, and a visible fiction badge. The prefix survives sharing, exports, and reads from older schemas. They are never described as verified student stories. They remain subject to the normal report, hiding, reply, and Poke systems. Admin removal is limited to posts created by this system.

## Setup

1. Apply `supabase/migrations/20261019024537_confession_bots.sql` after the existing project migrations. It adds `confessions.is_automated` and two private tables for bot settings and durable job records. It does not delete or replace existing data. New profiles are disabled by default; the migration does not create profiles or publish anything.
2. Configure the following **server-only** environment variables in the intended deployment environment:

   | Variable | Purpose |
   | --- | --- |
   | `BOT_ADMIN_PASSWORD_HASH` | Salted scrypt hash of the owner's password. The plaintext password is never stored. |
   | `BOT_ADMIN_SESSION_SECRET` | Independent random secret, 32–256 characters, used for the short-lived owner session. |
   | `CRON_SECRET` | Different random token, 32–256 characters. Vercel sends it as a Bearer authorization header to the scheduler endpoint. |
   | `BOT_AI_MODEL` | AI Gateway model ID supporting strict JSON schema, for example `openai/gpt-4.1-mini` (verify current availability). |
   | `AI_GATEWAY_API_KEY` | AI Gateway authentication for local/non-Vercel execution; optional when a valid Vercel runtime `VERCEL_OIDC_TOKEN` is available. |

   For local password setup, run `npm run admin:password --prefix server`. It reads the password without displaying it, saves only its salted hash and a generated session secret to the ignored `server/.env`, and prompts the development watcher to reload. For deployment, put those two generated values in the server-only Vercel environment settings. Existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, Spotify credentials, `DELETE_KEY_PEPPER`, and moderation configuration are still required. Never reuse their secrets for admin or scheduler access, add `VITE_` prefixes, or put credentials in URLs. Sign-in creates a 30-minute HttpOnly, SameSite=Strict cookie; HTTPS deployments also mark it Secure. Sign out clears that browser's cookie. Changing the password hash or session secret invalidates previous sessions. Do not rotate existing author-key secrets during routine setup.
3. Run `npm run check:schema --prefix server`, `npm test`, `npm run lint`, and `npm run build`. Deploy only after the migration and environment are ready.
4. Open `/admin/bots`, sign in with your password, create a disabled bot, and use **Preview only** to review a sample without saving a confession. Then enable it and save. **Run now · publish one** explicitly publishes one eligible confession. Each bot has a lifetime post limit and automatically disables when that limit is reached. Increase its limit and enable it again to continue; existing counts are preserved.

Generation and preview requests use the configured AI provider and may incur charges. This implementation and its verification do not provision paid services, call a live generation provider, enable production bots, or create production confessions automatically.

## Scheduling and failure handling

`vercel.json` includes a daily scheduler at `0 0 * * *` (8 am Philippine time). Each authenticated tick processes **at most one job globally** within the existing serverless function. The configured bot interval is a minimum between scheduled attempts, not a promise that the host wakes up at that exact time. Daily scheduling does not honor a fifteen-minute interval by itself. For finer cadence or several posts per day, configure a supported, authenticated scheduler to call `GET /api/cron/confession-bots` more often; keep the same Bearer `CRON_SECRET`. [Vercel's scheduling restrictions](https://vercel.com/docs/cron-jobs/usage-and-pricing) depend on the hosting plan. A manual run may run before a bot's next scheduled time, subject to the global quota and lifetime cap.

The database serializes claims, fences workers with a 90-second lease token, stores approved drafts, and remembers request keys and normalized content digests. Retries reuse the draft and request identity. Publication and job completion share a transaction, so a lost HTTP response cannot cause a second insert. Disabled or edited bots cancel unfinished jobs, and stale workers cannot publish. Job records remain after generated posts are removed, preserving duplicate protection.

Transient upstream failures and rate limits retry on later ticks, up to three attempts, honoring bounded `Retry-After` delays. Invalid output, failed safety review, and duplicate drafts stop that job. Recent activity shows status, attempts, safe error codes, and retry eligibility. Refresh before retrying an ambiguous request. No raw provider response, credentials, student messages, or raw IP addresses are logged. No process memory is used for job coordination.

Generation varies category, style, tone, length, language, and everyday scenario, with only previous **bot-generated** excerpts supplied for variety. It never reads student confessions as prompting material. Strict JSON output, deterministic checks for contact/identifying information, a separate model safety review, recent-content similarity checks, and a unique normalized digest guard publication. These checks reduce unsafe or repetitive output; automated review is not infallible. Review previews and activity and pause bots if output is unsuitable. [AI Gateway structured output documentation](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/structured-outputs) describes the provider contract used without adding runtime dependencies.

## API and verification

Admin sign-in uses `POST /api/admin/bots/login` with `{ password }`. Subsequent admin requests use the HttpOnly session cookie, and all admin POSTs also require `X-Bot-Admin: 1` from the same site's interface. Login attempts have a shared PostgreSQL quota; sessions expire after 30 minutes. No public user accounts were added. The old admin Bearer key is not accepted. Cron access still uses its separate Bearer secret. Both gates fail closed and use shared database rate limits. Private tables have RLS and no grants to browser roles; RPCs use `SECURITY INVOKER` and are service-role-only.

| Endpoint | Behavior |
| --- | --- |
| `POST /api/admin/bots/login` | Verify the owner's password and set the HttpOnly session cookie |
| `POST /api/admin/bots/logout` | Clear this browser's admin cookie |
| `GET /api/admin/bots` | Settings, last 50 jobs, configuration readiness, available options |
| `POST /api/admin/bots/save` | Create or update `{ id?, enabled, settings }`; at most five bot profiles |
| `POST /api/admin/bots/preview` | Generate/safety-check `{ settings }` and find a song; never publish |
| `POST /api/admin/bots/run` | Run `{ botId, requestKey }`; reuse the UUID request key for a retry |
| `POST /api/admin/bots/remove` | Remove `{ confessionId }` only when it belongs to this system |
| `GET /api/cron/confession-bots` | Resume an interrupted job or process one due bot, using the cron Bearer secret |

`npm test` exercises the SQL migration and HTTP workflow using PGlite, fixture AI and Spotify responses, permissions, caps, quotas, concurrent duplicate requests, lost-response recovery, stale leases, stop/edit cancellation, safety rejection, retries and removal. `npm run build && npm run verify:bots` additionally runs the actual `npm run check:schema --prefix server` command against a read-only fixture API and drives the compiled React UI through login, preview, save, enable, publish, activity, locking, and the public fiction badge. It checks 360px/desktop overflow and browser errors. It needs root development dependencies and Playwright Chromium (`npx playwright install chromium` if not already installed). Port 4173 must be free. Screenshots use only isolated fictional fixture data. These checks do not prove live provider credentials or production scheduler execution; verify those after deployment with an unpublished preview first.
