# Anonymous author controls, reports, sharing and song replies

Update, 2026-10-18: the consolidated catch-up schema has now been applied to the
live dssconfessions project with user authorization; the live schema checker
passes 47/0. See [schema repair status](schema-repair.md). Secrets, cleanup cron
and deploying local feature code remain pending; the original rollout notes below
are historical.

Implemented locally; the migrations, cron job, environment variables and Vercel
deployment below still need to be applied. No production confessions were posted,
reported, hidden or deleted during development. No new project dependencies or
fonts were added. The browser continues to use only the Express API, never direct
Supabase table access.

## Deployment order

For a legacy or uncertain database, use the single-file
[schema catch-up repair](schema-repair.md) instead of the historical sequence
below. It includes all limiter, index, trending and feature prerequisites and
provides `npm run check:schema --prefix server` verification. Cron and server-only
secrets below remain required operational setup.

For the existing project, keep already-applied migrations intact. Do not re-run
the original non-idempotent rate-limit migration on an initialized database.

1. Existing prerequisite: `supabase/migrations/20261018080243_serverless_rate_limits.sql`.
2. Existing indexes: `supabase/migrations/20261018080247_confession_indexes.sql`.
3. Existing trending prerequisite: `supabase/trending-searches.sql` (if not applied).
4. **New:** `supabase/migrations/20261018100410_anonymous_features.sql`.
5. Enable Supabase Cron and run the cleanup scheduling SQL below.
6. Set server environment variables, deploy frontend and API together, and test
   the canonical confession URL and `_spa=1` bypass on the real Vercel deployment.

The new migration is transactional and re-runnable. Existing confessions retain
their content, have a null delete-key hash, are visible, and allow replies by
default. It adds `delete_key_hash`, `allow_replies`, `is_hidden`, `needs_review`,
the `replies` and `reports` tables, indexes and service-role-only RPCs. New tables
have RLS and no public policies; public/anonymous/authenticated grants are revoked.
The existing confession table is also restricted to the service-role API.

### Vercel environment variables

Add these as server-only variables in the environments you deploy:

| Variable | Requirement |
| --- | --- |
| `DELETE_KEY_PEPPER` | Required for posting and author controls; independent random secret, at least 32 characters |
| `REPORT_HASH_SECRET` | Required for reports; a different independent random secret, at least 32 characters |
| `ADMIN_WEBHOOK_URL` | Optional Discord webhook; only HTTPS discord.com/discordapp.com `/api/webhooks/` URLs are used |

Keep the existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`,
`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `ALLOWED_ORIGIN`.
`CLIENT_URL` remains supported for compatibility. Do not prefix secrets with
`VITE_`. No `CRON_SECRET` is needed: cleanup runs inside Postgres, not a public
Vercel cron endpoint.

Run this **separately for each new secret**, then paste each result into Vercel:

```powershell
node -p "require('node:crypto').randomBytes(32).toString('base64url')"
```

Missing/short/reused secrets return clean 503 errors for affected operations;
they do not crash the API. Never rotate `DELETE_KEY_PEPPER` casually: existing
delete-key hashes depend on it. Losing the pepper or an author's key means only
an administrator can remove that content. Changing `REPORT_HASH_SECRET` also
changes de-duplication identifiers; keep it separate from the delete pepper and
service-role credential.

### Required scheduled hash cleanup

Enable [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart) first.
Then run this once in the SQL Editor as the project database administrator:

```sql
select cron.schedule(
  'dssconfessions-safety-cleanup',
  '7 * * * *',
  $$
    select public.purge_report_hashes(14);
    delete from app_private.api_rate_limits where expires_at <= now();
  $$
);
```

This runs hourly. Report hashes are nulled after 14 days, with up to an hour's
scheduling delay; reasons, details, timestamps and counts remain. Limiter hashes
are removed after their quota expires, with the same scheduling delay. Before
cleanup is configured, these physical-deletion guarantees do not hold. The
existing limiter also has lazy cleanup after one additional day. Monitor the job:

```sql
select jobid, jobname, schedule, active from cron.job
where jobname = 'dssconfessions-safety-cleanup';
select jobid, status, start_time, end_time
from cron.job_run_details order by start_time desc limit 10;
```

No client identifiers are included in the job command or job logs. The cleanup
function is SECURITY INVOKER with an empty search path; execution is revoked from
public browser roles. An administrator can run `select public.purge_report_hashes(14);`
manually, but that is not a substitute for scheduling it.

## Delete keys

`POST /api/confess` keeps `status: "success"` and **adds** `deleteKey` exactly once:

```json
{"status":"success","deleteKey":"DSS-7K3F-9QXM-2PWD-8TRV"}
```

There are 16 unbiased random characters from a 31-character alphabet: about
79 bits of entropy. Node `crypto.randomBytes` generates the key. Only its
HMAC-SHA256 digest using `DELETE_KEY_PEPPER` is stored; verification uses
`crypto.timingSafeEqual`. The key is never in public reads, URLs, history state,
local/session storage, analytics or application logs. Its optional text-file
download stays on the author's device. A blocking, focus-trapped save-key modal
persists at the app root across in-app navigation; Escape/close asks whether the
key was saved. Reload/unload has the browser's unsaved-data confirmation.

```text
POST /api/confessions/:id/delete
POST /api/confessions/:id/author
POST /api/confessions/:id/replies/:replyId/delete
```

All accept `{"key":"DSS-7K3F-9QXM-2PWD-8TRV"}` and return
`{"status":"success"}`. The author route only verifies the key to unlock reply
controls; it creates no login session or persistent token. The browser retains
that key only in component memory, clearing it on navigation or explicit Lock.

Deletion is hard deletion, because author removal should also remove associated
replies/reports. Foreign keys cascade those deletions. Correct confession deletion
replaces the current history entry with Home and shows a toast. Valid-format wrong,
missing-target and legacy keys return the same 403 `{"error":"That key doesn't match."}`.
Malformed UUIDs/keys return 400 before querying the database. UUID case is
canonicalized before deriving target quotas. All three author operations share
five attempts per client/parent per 15 minutes and a global 15-attempt cap per
client per 15 minutes, so the verification route cannot bypass deletion quotas.

Network failure after a successful post can lose the one-time response. Keys are
not recoverable or re-issued. Legacy confessions cannot use API self-deletion;
use the administrator SQL below.

## Reports and takedown

```text
POST /api/reports
{"targetType":"confession","targetId":"<uuid>","reason":"names_me","details":"Optional, up to 300 characters"}
-> 200 {"status":"success"}
```

Target types are `confession` and `reply`. Reasons are `names_me`, `harassment`,
`private_info`, `hate_or_threat`, `spam`, `other`. Unknown fields are ignored.
No account, email, user ID, raw IP or user agent is stored. A client can submit ten
reports per hour. Duplicate reports and missing/hidden targets also return generic
success. Server/DB failures return generic JSON 503 errors; quotas return 429 with
Retry-After. The UI displays the server message without logging request bodies.

Each report stores `id`, `target_type`, `target_id`, `reason`, optional `details`,
`reporter_hash`, and `created_at`. Extra `confession_id` and nullable `reply_id`
foreign keys enforce cascading deletion for the polymorphic target. The hash is
HMAC-SHA256 of normalized client IP plus the current UTC date using
`REPORT_HASH_SECRET`. It rotates daily and is not an account or proof of identity.
Uniqueness on `(target_type,target_id,reporter_hash)` prevents repeat votes that day.
The hash is nullable specifically to permit retention cleanup without deleting
the report history. No hash fields are publicly returned.

`submit_content_report` locks the parent, then the target, and inserts, counts and
sets moderation flags in one transaction. Three distinct daily identifiers hide
the target. One `names_me`, `private_info` or `hate_or_threat` report marks it for
review. An urgent duplicate can escalate review but cannot add another vote.
Tunable thresholds, reasons and quotas are in `server/config/features.js`.
Counters include retained report rows even after their hashes are purged.

IP-based identifiers approximate clients: people behind the same NAT or IPv6
subnet can share one identifier; one person on different networks/days can get
different identifiers. This is abuse resistance without fingerprinting, not a
guarantee of three distinct humans. Reports remain unverified removal requests.

Hidden confessions are filtered from feed/search/lookup, replies and trending
eligibility. Hidden replies are filtered from reply lists. Trending terms still
use the existing normalization, hit threshold, ordering and background cooldown;
they must now have at least one visible matching confession. Replies never affect
`search_terms`. Moderated content reads use `no-store`, replacing the old 15/60
second CDN caches so hidden records cannot keep being served from them.

When configured, the Discord notification contains only reason, target type,
parent confession UUID and canonical link. No message, note, recipient, report
details or client hash is sent. Notifications use `waitUntil`, a four-second
timeout, disabled Discord mentions and best-effort failure handling. They are not
a durable queue; delivery can fail. No webhook means no external notification.

## Song replies

Confession posts optionally accept `allowReplies` (boolean, defaults true). This
is additive; it is not added to old feed objects. New settings are fetched here:

```text
GET /api/confessions/:id/settings -> {"allowReplies":true}
GET /api/confessions/:id/replies -> [{"id":"<uuid>","confession_id":"<uuid>","song_name":"...","artist_name":"...","album_art":null,"spotify_url":"...","spotify_track_id":"...","note":"...","created_at":"..."}]
POST /api/confessions/:id/replies
{"song":{"id":"0123456789ABCDEFGHIJKL"},"note":"Optional, up to 140 characters"}
-> {"status":"success"}
```

Songs use the same server-side Spotify verifier as confession posts; untrusted
client title/artist/art values are ignored. The RPC locks the parent before
counting/inserting. The cap is 20 total replies, including hidden replies, oldest
visible replies first. Hidden/deleted parents give 404; disabled replies and full
parents give 409. Public lists use explicit columns. Replies have their own UUID,
parent foreign key, verified song columns, note, moderation flags and timestamp.
There is no author identity column.

Limits are ten attempts/hour/client and three attempts/day/client/parent.
Malformed reply payloads also consume quota as abuse prevention. Reply requests
and fetches have guarded submit handlers and AbortController cleanup. A reply's
play button switches the existing single Spotify iframe to that track; changing
tracks or navigating away unloads the previous embed. It does not invent
cross-origin play/pause telemetry.

The confession author's delete key also removes replies through the route above.
Each reply can be reported. Disabling replies hides the entire reply section,
including existing replies, and blocks new writes.

## Share images and OG routing

The new Share modal draws 1080x1350 or 1080x1920 PNGs with Canvas, using existing
loaded fonts and theme colors. It bounds line wrapping, breaks long words,
ellipsizes overflow, and uses a vinyl fallback if art is absent/CORS-blocked or
would taint the canvas. FROM is omitted for blank/Anonymous senders. `navigator.share`
uses files when supported; otherwise the PNG downloads. Download and Copy link
remain available. No image is uploaded. The old Save for IG action remains.

`client/public/og-record-shop.png` is a generic static 1200x630 branded image.
No dynamic server image generator or new dependency was added.

Every canonical `/confession/:id` request first reaches the new HTML wrapper in
`server/og.js`. Its meta-refresh links to `/confession/:id?_spa=1`; a query-matched
rewrite above it serves `index.html` for that explicit bypass. All existing
non-API SPA rewrites remain below these rules, and the History API router parses
the same pathname and ignores `_spa`. In-app navigation still uses the original
router without an extra document load or dialog history entries. `/api/og/confessions/:id`
also exposes the wrapper for testing. See [Vercel rewrites](https://vercel.com/docs/routing/rewrites).

Recognized preview crawlers receive the OG HTML without meta-refresh so they do
not follow it into the SPA and lose recipient-specific tags. User-Agent is read
transiently for this routing decision, never stored, hashed or logged; no client
profile is created. Human browsers receive the immediate refresh, and either
variant includes an explicit Open link. Responses vary by User-Agent and remain
uncached. Unknown crawler behavior still needs a real-provider debugger check.

The wrapper uses the service-only `confession_preview` RPC, whose single SQL
statement checks visibility, moderation flags and report existence and projects
only a recipient. `visible_song_replies` similarly joins parent and reply
visibility in one statement, preventing inconsistent multi-query reads during
moderation. Unreported visible content gets `A confession for {TO}` and `Someone
sent a song to {TO}`. Any report, needs-review flag, hidden or missing content
gets generic tags. Message bodies are never included, even when short. Text is
HTML-escaped; the canonical host is fixed to prevent Host-header injection.
Both wrapper and SPA confession pages have noindex/nofollow (HTTP header plus
meta); wrappers and moderated API reads are uncached. Search-engine/social cache
behavior still requires a real-deployment debugger check. Already-downloaded
images, previously-rendered content and third-party preview caches cannot be
recalled by the application.

## Administrator SQL

Run only in the owner's Supabase SQL Editor. Substitute an actual UUID for
`00000000-0000-0000-0000-000000000000` before any write.

```sql
-- Confession review queue with reasons/counts.
select c.id,c.recipient_to,c.is_hidden,c.needs_review,
       count(r.id) as reports, string_agg(r.reason, ', ' order by r.created_at) as reasons
from public.confessions c left join public.reports r
  on r.target_type='confession' and r.target_id=c.id
where c.needs_review or c.is_hidden group by c.id order by c.created_at;

-- Reply review queue.
select p.id,p.confession_id,p.is_hidden,p.needs_review,
       count(r.id) as reports, string_agg(r.reason, ', ' order by r.created_at) as reasons
from public.replies p left join public.reports r
  on r.target_type='reply' and r.target_id=p.id
where p.needs_review or p.is_hidden group by p.id order by p.created_at;

-- Restore a confession (use public.replies to restore a reply instead).
update public.confessions set is_hidden=false, needs_review=false
where id='00000000-0000-0000-0000-000000000000';

-- Permanently delete a confession, cascading replies/reports.
delete from public.confessions where id='00000000-0000-0000-0000-000000000000';
-- Or delete one reply and its reports.
delete from public.replies where id='00000000-0000-0000-0000-000000000000';

-- Legacy deletion only (pre-key confession).
delete from public.confessions
where id='00000000-0000-0000-0000-000000000000' and delete_key_hash is null;
```

Restoration retains report history. A future distinct report can immediately
reach the threshold again. If you intentionally dismiss/reset the reports, use
this separate destructive action and then restore the target:

```sql
delete from public.reports where target_type='confession'
and target_id='00000000-0000-0000-0000-000000000000';
```

Do not paste keys or hashes into support messages or logs. Do not grant public
table access to build an admin interface.

## Privacy Guarantee copy

The About page now says:

> No accounts are required. Our application does not store raw IP addresses or use browser fingerprints. Our database stores only hashes of delete keys. Rate limiting uses expiring hashed counters; report de-duplication uses a daily-changing hash, cleared by scheduled cleanup after 14 days. Report reasons and counts remain for moderation. We count popular recipient searches, not who searched. Share images are generated on your device and are never uploaded by us. Hosting and music providers may process their own operational data.

The badge now reads “Anonymous by design · Limited safety data” rather than
claiming “Zero Logs” or absolute anonymity. Configure the cleanup job before
deploying this copy.

## Verification and manual checklist

Automated checks: Node tests against PGlite/Postgres schema + HTTP, client lint,
production build, and browser fixtures at 1440px and 360px (reduced motion on mobile).
Final results: **30 Node tests passed**, ESLint and production build passed,
and **12 browser accessibility scans had zero A/AA violations**. A separate browser
test verified the actual OG HTML/meta-refresh with the SPA, one added history
entry, correct noindex metadata and Back returning to the previous page. The
Vercel deployment itself still needs the platform debugger check below.
No live posts/reports/deletions were used. Browser fixtures tested the save/copy/
download key modal, double-submit guards, wrong key, replies, report dialogs,
author reply removal, deletion/history replacement, PNG dimensions, anonymous
FROM omission, silent broken-art fallback and accessibility.

- [ ] Apply migration and verify cron job runs on the intended Supabase project.
- [ ] Add independent secrets; validate missing-secret 503s in a preview environment.
- [ ] Post -> save/copy/download key -> acknowledge -> open detail -> delete.
- [ ] Use a wrong key and a legacy confession; check generic errors and 429 limits.
- [ ] Report from three different test network identifiers -> verify auto-hide from
  feed/search/trending/direct lookup/replies. Test one urgent report separately.
- [ ] Submit a reply, note >140 chars, fake song, disabled replies, full 20-reply
  cap, and author removal; verify reply reports and parent deletion cascades.
- [ ] Share/download both PNG sizes on desktop and a real mobile share sheet.
- [ ] Check an unreported, reported, hidden and missing canonical link in a social
  preview debugger; verify no message text, noindex and the `_spa=1` bypass.
- [ ] Check Home/Browse -> detail -> Back/Forward, direct refresh, and dialogs:
  opening/closing must not add history entries. An unsaved key panel must remain.
- [ ] Check keyboard-only Tab/Shift+Tab/Escape, focus return, 360px overflow, and
  reduced motion. Test authenticated real Spotify playback separately.
- [ ] Review optional webhook delivery with a test channel; content must contain
  only reason/type/UUID/link. Review requests include no body-logging middleware.

The existing Browse chip cancellation issue recorded in the restyle report is
not repaired here: search behavior was out of scope. BUG-001–003 routing and
history handlers, BUG-004 cancellation plumbing, BUG-006 error extraction,
BUG-007 not-found handling and BUG-008 art fallback were retained. BUG-005 is
strengthened with the requested synchronous ref guard. Only the explicitly
requested additive `deleteKey` field changes an existing response shape.

## Files in this feature change

New: `server/config/features.js`, `server/features.js`, `server/og.js`,
`server/utils/delete-key.js`, `server/utils/report-hash.js`,
`server/utils/verified-track.js`, `server/test/features.test.js`,
`supabase/migrations/20261018100410_anonymous_features.sql`,
`client/src/hooks/features.js`, `client/src/utils/shareCard.js`,
`client/src/components/ui/Modal.jsx`, `DeleteKeyReceipt.jsx`, `ShareDialog.jsx`,
`ConfessionFeatures.jsx` (same UI directory), `client/public/og-record-shop.png`,
and this document.

Updated: `server/app.js`, `server/.env.example`, `server/test/api.test.js`,
`server/test/search-trends.test.js`, `vercel.json`, `client/src/hooks/index.js`,
`client/src/App.jsx`, `client/src/index.css`, `client/src/views/SubmitView.jsx`,
`DetailsView.jsx`, `AboutView.jsx` (same views directory), `docs/BUGS.md`,
and `docs/trending-searches.md`. Earlier uncommitted restyle/migration work remains
in the workspace and is not all attributable to this feature patch.
