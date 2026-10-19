# Performance audit — DSSConfessions

Measured 2026-10-19. Baseline source: commit 4332f1b, built and saved before edits. Results are local measurements, not a production capacity estimate or a PageSpeed score.

## Changes

- Split screen code into on-demand chunks; preload only the requested informational screen. Keep prerendered content visible until its screen is ready, avoiding a loading flash.
- Request the confession feed on Home only, keep it across navigation, and invalidate it after posting or deletion.
- Stabilize recipient search callbacks so typing does not reset the query or send duplicate searches.
- Defer the archive lightbox code until opened; preserve zero initial archive image requests.
- Initialize the scrubber particle pool once and skip redundant overflow observers for cards already known to need Read more.
- Save the departing history entry's scroll position and restore it on Back/Forward.

## Per-screen comparison

Median of three fresh browser contexts per screen. Page ready means the React screen has mounted; Home and confession details also wait for their fixture content. Smaller is better. Improvement is the reduction in page-ready time; negative values are slower.

| Screen | Page ready, ms: before → after | Improvement | JavaScript gzip KB: before → after | API requests: before → after |
| --- | ---: | ---: | ---: | ---: |
| Home | 3,269 → 3,460 | -5.8% | 129.5 → 99.5 | 1 → 1 |
| Browse | 2,734 → 2,708 | 0.9% | 129.5 → 101.4 | 2 → 1 |
| Browse results | 4,669 → 3,519 | 24.6% | 129.5 → 101.4 | 4 → 2 |
| Confess | 2,881 → 2,573 | 10.7% | 129.5 → 102.9 | 1 → 0 |
| Confession | 3,232 → 3,012 | 6.8% | 129.5 → 112.4 | 4 → 3 |
| About | 2,929 → 2,836 | 3.2% | 129.5 → 101.2 | 1 → 0 |
| DSSC | 3,474 → 3,196 | 8.0% | 129.5 → 103.1 | 1 → 0 |
| FAQ | 3,012 → 2,915 | 3.2% | 129.5 → 103.6 | 1 → 0 |
| Privacy | 2,857 → 2,732 | 4.4% | 129.5 → 101.5 | 1 → 0 |
| Send guide | 3,295 → 2,946 | 10.6% | 129.5 → 101.9 | 1 → 0 |
| Song guide | 3,155 → 2,688 | 14.8% | 129.5 → 102.5 | 1 → 0 |
| Safety guide | 3,000 → 2,973 | 0.9% | 129.5 → 102.4 | 1 → 0 |
| Bot login | 2,573 → 2,331 | 9.4% | 132.9 → 105.4 | 1 → 0 |

Screens with a measured ready-time regression over 5%: Home. These are retained in the comparison; no universal speedup is claimed.

LCP is the largest visible paint. Blocking time sums the portion over 50 ms of observed long tasks, within this audit window; it is not Lighthouse TBT. CLS measures unexpected layout movement.

| Screen | LCP, ms: before → after | Blocking time, ms: before → after | CLS: before → after |
| --- | ---: | ---: | ---: |
| Home | 3,212 → 3,392 | 901 → 1,263 | 0.02 → 0.02 |
| Browse | 656 → 636 | 691 → 698 | 0 → 0 |
| Browse results | 5,376 → 3,464 | 2,402 → 1,317 | 0.18 → 0.17 |
| Confess | 664 → 708 | 459 → 417 | 0 → 0 |
| Confession | 3,072 → 2,860 | 774 → 764 | 0 → 0 |
| About | 2,520 → 2,672 | 636 → 652 | 0 → 0 |
| DSSC | 3,144 → 1,128 | 633 → 445 | 0 → 0 |
| FAQ | 2,480 → 2,732 | 432 → 452 | 0 → 0 |
| Privacy | 2,496 → 2,536 | 410 → 512 | 0 → 0 |
| Send guide | 2,964 → 2,752 | 835 → 563 | 0 → 0 |
| Song guide | 2,716 → 2,452 | 520 → 295 | 0 → 0 |
| Safety guide | 2,652 → 2,748 | 617 → 417 | 0 → 0 |
| Bot login | 696 → 692 | 502 → 516 | 0.44 → 0 |

## Stress tests

Each phase sends 900 finite mixed requests through real Express routes and a fresh isolated PostgreSQL engine containing 5,000 fictional rows, before any browser interactions. The mix covers feed reads, recipient searches, settings, replies and a fixture Spotify search. HTTP tests run unthrottled on localhost; mobile throttling applies only to browser measurements. No real Spotify or AI requests are made. Public API behavior was preserved; throughput differences include local runtime variation and are not attributed solely to frontend changes.

| Concurrent requests | Requests per phase | p95 latency, ms: before → after | Requests/sec: before → after | After successful responses |
| ---: | ---: | ---: | ---: | ---: |
| 10 | 300 | 93.7 → 89.82 | 193.58 → 184.1 | 300/300 |
| 25 | 300 | 119.74 → 111.87 | 286.57 → 274.5 | 300/300 |
| 50 | 300 | 229.98 → 245.1 | 297.59 → 270.04 | 300/300 |

- Shared read quota: 60 successes and 10 expected HTTP 429 responses from a 70-request burst; Retry-After present.
- Atomic Pokes: 100 simultaneous requests produced exactly 1000 increments, with no lost counts.
- Reply cap: 15 simultaneous submissions yielded 10 accepted and 5 full-thread conflicts.
- Browser stress: 6 concurrent visitors, 48 in-page navigations, zero runtime errors.
- 100 rapid Poke taps still batch into 1 request; song search still debounces to one request for an 11-character burst.
- Editing a bookmarked recipient search: before the input reset to “SAMPLE” and sent 2 unwanted requests; after it retained “SAMPLE EDIT” and sent zero.
- History: before Back restored 0px instead of 1108px; after it restored exactly 1108px.
- Share modal, archive viewer, admin sign-in/out and all 13 screens at 360px passed; zero horizontal overflow and zero initial archive image downloads.

## Conditions and limits

Chromium 156.0.8078.4; 390×844 viewport; 4× CPU slowdown; 80 ms simulated latency; 200,000 bytes/sec download and 100,000 bytes/sec upload. Static assets are gzip-compressed. Screens run sequentially, in fresh contexts. Informational routes use their built prerendered HTML.

All API traffic stays in a disposable in-process PGlite database and all third-party traffic is intercepted with neutral fixtures. External font downloads are disabled for repeatability; the site's font definitions are unchanged. These figures therefore do not cover real font loading, Supabase network latency, Vercel cold starts, production load, actual Spotify embeds, or field INP. PGlite is single-process and does not model a multi-core hosted PostgreSQL service. No production stress test was performed.

Bot activation is separate from this harness: the requested local scheduler uses the configured project database and published one clearly fictional story through the normal API. The performance tests never touch that database. Public asset changes have not been deployed by this task.

## Reproduce

Install the existing root, client and server development dependencies and Playwright Chromium. Port 4173 must be free. Before changing code, run npm run build, then npm run perf:snapshot to retain the baseline. After changes, build again and run npm run perf:compare. An existing baseline is deliberately never overwritten. The local snapshot is under .vercel/performance/before/site and is ignored by Git.

Raw measurements: [before](performance-results/before.json), [after](performance-results/after.json), [baseline interactions](performance-results/before-interactions.json), [before HTTP stress](performance-results/before-stress.json), [after HTTP stress](performance-results/after-stress.json). Test setup: [fixture](scripts/performance/fixture.cjs), [audit](scripts/performance/audit.mjs). No new runtime dependencies were added. Performance changes require no schema changes; the bot recipient-label update uses a separate additive function migration described in [AUTOMATION.md](AUTOMATION.md).

## Delivery checks and files

Recorded 2026-10-19T04:00:57.525Z: npm test — 79 passed; npm run verify:bots — 16 passed; npm run check:schema --prefix server — 53 passed; lint, production build, diff whitespace check and client secret scan passed. See [validation record](performance-results/validation.json).

Loading and navigation changes are in [App](client/src/App.jsx), [route views](client/src/route-views.js), [hooks](client/src/hooks/index.js), [Browse](client/src/views/BrowseView.jsx), [scrubber](client/src/components/ui/MixtapeScrubber.jsx), [archive](client/src/components/ui/DesignArchive.jsx), [Vite config](client/vite.config.js) and [prerender](scripts/prerender.mjs). Bot writing, scheduling, submission, disclosure and environment setup are documented in [AUTOMATION.md](AUTOMATION.md). All new credentials are server-only and kept in the ignored server/.env; no AI key is required.

The database's bot control function remains inaccessible to anonymous and authenticated browser roles. Supabase advisors still report the pre-existing public add_reply SECURITY DEFINER execution grants; that separate reply permission finding was not changed by this bot disclosure patch.
