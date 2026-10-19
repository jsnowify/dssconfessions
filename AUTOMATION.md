# Automated fictional confessions

The bot controls live at `/admin/bots`. This is an administrator-only creative-writing feature, separate from the anonymous student submission form. No public accounts, student identities, or visitor tracking were added. The page and its APIs are excluded from indexing.

The owner-selected collection is now **Short Stories**: the 500 original fictional Tagalog stories in `server/bots/data/500_pinoy_horror_stories.json`. Titles and paragraphs are preserved. The uploaded file is treated only as story data. The earlier English-only setting applies to generated writing; the imported collection preserves the owner's supplied language.

`npm run bots:stories --prefix server` verifies an unpublished sample, switches the existing profile to this collection, enables replies, pauses other profiles, and schedules the next 8 AM or 8 PM Philippine-time slot without publishing immediately. No new secrets or dependencies are needed. The local backend must remain running for both daily slots. The bundled Vercel cron remains once daily for Hobby compatibility; two daily production invocations require a supported scheduler after deployment. See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Selection uses cryptographic randomness among database-confirmed unused story IDs. Existing job digests and full story text, plus existing confession text, exclude previously published stories; removing a post keeps its durable job tombstone. The digest uses the story body, so changing a title does not make it new. The existing database lease and unique digest prevent racing workers from publishing duplicates. Failed, never-published reservations can be released for a later attempt. At most two collection posts may publish per Manila calendar day across profiles, including manual runs and deleted posts. Exhaustion pauses the bot; it never falls back to generated text. The collection normally lasts 250 days at two stories per full day.

The optional default generator is built in. It combines reviewed English-only funny and supernatural horror stories using native cryptographic randomness, with different tones, writing styles and lengths. Select Funny, Horror, or both in the admin controls. It needs no AI service, model key, credits or card. Its writing is limited to the included material; add reviewed scenes in `server/bots/local-generation.js` to expand its range. Story types are stored in the existing settings JSON; no new tables or schema migration are needed.

For the existing local setup, `npm run bots:enable --prefix server` configures the built-in generator, verifies an unpublished sample and its Spotify match, enables one bot and performs its first due run through the protected API. Defaults are one post per day, ten posts total, replies off. It preserves existing password credentials and human author-key secrets. The local timer checks every minute while the backend runs; PostgreSQL decides when a post is due and prevents overlapping runs. Closing the backend stops local scheduling. The included production cron remains daily at 8 am Philippine time and requires deployment of this code and the server environment.

## Existing flow and integration

The Vite/React SPA uses the custom History API router in `client/src/App.jsx`. `useConfessions` posts to Express `POST /api/confess`, which enforces a shared PostgreSQL quota, validates the recipient/message/Spotify track ID, verifies track metadata with Spotify, creates a private author Delete Key, and inserts into `public.confessions`. The feed selects only public fields and filters hidden posts. Reports, author controls, Pokes, song replies, retain their existing endpoints. Song replies now support 500 visible replies per confession using the existing parent-locked `add_reply` RPC. The UI keeps a ten-segment capacity meter and initially renders 25 replies, with 25 more per Show more click. Existing replies above the new cap remain readable. Both reply-write RPCs are service-role-only.

Both humans and bots now use `server/services/confession-submission.js` for the same input validation, Spotify verification, author-key hashing, and row construction. Bots use an atomic persistence RPC so saving the confession, completing its job, and incrementing its bot count either all commit or all roll back. There is no HTTP call to the site's own public URL, no impersonated user, and no bypass of a human's quota. All bots share the existing 15 submissions per 15 minutes policy under a dedicated synthetic client key. Public callers cannot set the internal automation context or `is_automated` flag.

Generated posts use **To: Short Stories** and sender **Mixtape Bot (fiction)**. The large separate badge is removed. The recipient disclosure remains in cards, details, sharing and exports, including reads from older schemas. Older bot posts with the previous text prefix also display that recipient label. The new format does not duplicate the disclosure in the story text. These posts are never described as verified student stories and retain normal reports, hiding, replies and Pokes. Admin removal is limited to posts created by this system.

## Setup

1. Apply migrations in order: `20261019024537_confession_bots.sql`, `20261019034400_bot_disclosure_in_recipient.sql`, `20261019043830_curated_horror_library.sql`, then `20261019043834_replies_500.sql` from `supabase/migrations/`, after the existing project migrations. These add the original private bot settings/jobs, update recipient compatibility, add collection selection and daily caps, and increase reply capacity. They preserve existing rows. The collection reuses existing settings/jobs; it adds no tables. New profiles start disabled.
2. Configure the following **server-only** environment variables in the intended deployment environment:

   | Variable | Purpose |
   | --- | --- |
   | `BOT_ADMIN_PASSWORD_HASH` | Salted scrypt hash of the owner's password. The plaintext password is never stored. |
   | `BOT_ADMIN_SESSION_SECRET` | Independent random secret, 32–256 characters, used for the short-lived owner session. |
   | `CRON_SECRET` | Different random token, 32–256 characters. Vercel sends it as a Bearer authorization header to the scheduler endpoint. |
   | `BOT_GENERATOR` | `local` (default) for built-in writing. No external AI credentials required. |
   | `BOT_LOCAL_SCHEDULER` | `1` enables the development server timer; disabled in Vercel functions. |
   | `BOT_DELETE_KEY_PEPPER` | Optional separate bot author-key secret, generated by local setup when the human posting secret is absent. Bot keys are never returned; authenticated admins manage these posts. |

   For local password setup, run `npm run admin:password --prefix server`. It reads the password without displaying it, saves only its salted hash and a generated session secret to the ignored `server/.env`, and prompts the development watcher to reload. For deployment, put those two generated values in the server-only Vercel environment settings. Existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, Spotify credentials, `DELETE_KEY_PEPPER`, and moderation configuration are still required. Never reuse their secrets for admin or scheduler access, add `VITE_` prefixes, or put credentials in URLs. Sign-in creates a 30-minute HttpOnly, SameSite=Strict cookie; HTTPS deployments also mark it Secure. Sign out clears that browser's cookie. Changing the password hash or session secret invalidates previous sessions. Do not rotate existing author-key secrets during routine setup.
3. Run `npm run check:schema --prefix server`, `npm test`, `npm run lint`, and `npm run build`. Deploy only after the migration and environment are ready.
4. Open `/admin/bots`, sign in with your password, create a disabled bot, and use **Preview only** to review a sample without saving a confession. Then enable it and save. **Run now · publish one** explicitly publishes one eligible confession. Each bot has a lifetime post limit and automatically disables when that limit is reached. Increase its limit and enable it again to continue; existing counts are preserved.

Built-in generation and previews make no AI calls. Song lookup and verification still use the existing Spotify integration. For an explicitly chosen legacy external generator, set `BOT_GENERATOR=ai`, `BOT_AI_MODEL`, and `AI_GATEWAY_API_KEY` (or the host's runtime OIDC token); that optional mode may incur provider charges. The local setup removes those optional AI values and uses built-in writing.

## Scheduling and failure handling

`vercel.json` includes a daily scheduler at `0 0 * * *` (8 am Philippine time). Each authenticated tick processes **at most one job globally** within the existing serverless function. The configured bot interval is a minimum between scheduled attempts, not a promise that the host wakes up at that exact time. Daily scheduling does not honor a fifteen-minute interval by itself. For finer cadence or several posts per day, configure a supported, authenticated scheduler to call `GET /api/cron/confession-bots` more often; keep the same Bearer `CRON_SECRET`. [Vercel's scheduling restrictions](https://vercel.com/docs/cron-jobs/usage-and-pricing) depend on the hosting plan. A manual run may run before a bot's next scheduled time, subject to the global quota and lifetime cap.

The database serializes claims, fences workers with a 90-second lease token, stores approved drafts, and remembers request keys and normalized content digests. Retries reuse the draft and request identity. Publication and job completion share a transaction, so a lost HTTP response cannot cause a second insert. Disabled or edited bots cancel unfinished jobs, and stale workers cannot publish. Job records remain after generated posts are removed, preserving duplicate protection.

Transient upstream failures and rate limits retry on later ticks, up to three attempts, honoring bounded `Retry-After` delays. Invalid output, failed safety review, and duplicate drafts stop that job. Recent activity shows status, attempts, safe error codes, and retry eligibility. Refresh before retrying an ambiguous request. No raw provider response, credentials, student messages, or raw IP addresses are logged. No process memory is used for job coordination.

Generation varies category, style, tone, length, language, and everyday scenario using only reviewed fictional material. It never reads student confessions for generation. Deterministic checks for contact/identifying information, recent-content similarity checks and the database's unique normalized digest guard publication. The local generator retries different combinations when a sample is too similar. Exact duplicates remain blocked across all job history. The optional external mode also requires strict JSON and a separate model safety review. Review previews and activity and pause bots if output is unsuitable.

## API and verification

Admin sign-in uses `POST /api/admin/bots/login` with `{ password }`. Subsequent admin requests use the HttpOnly session cookie, and all admin POSTs also require `X-Bot-Admin: 1` from the same site's interface. Login attempts have a shared PostgreSQL quota; sessions last 30 minutes and renew on authenticated requests once half their lifetime has elapsed. Expired sessions fail closed with `ADMIN_SESSION_REQUIRED`. If removal is interrupted, the UI keeps the selected post for confirmation after signing in again; sign-in never retries deletion automatically. No public user accounts were added. The old admin Bearer key is not accepted. Cron access still uses its separate Bearer secret. Both gates fail closed and use shared database rate limits. Private tables have RLS and no grants to browser roles; RPCs use `SECURITY INVOKER` and are service-role-only.

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

## Fresh confession notice

Home checks `GET /api/confessions?latest=1` once per minute while visible and again when the tab returns. This returns only the newest visible post ID and timestamp; it does not subscribe to private tables or expose story text. The floating mixtape card offers Refresh and Later. Later suppresses the current newest post until a newer one arrives. Navigation, hidden tabs and unmounting stop or skip background checks. Refresh uses the existing feed loader and never replaces the feed while someone is reading without their action.

`npm run verify:updates` checks the floating card, Later/Refresh behavior, lightweight API privacy, a full 500-reply fixture, progressive rendering and 360px overflow using an isolated database and neutral sample content.
