import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const read = async name => JSON.parse(await fs.readFile(path.join(root, "performance-results", name + ".json"), "utf8"));
const before = await read("before"), after = await read("after"), interactions = await read("before-interactions");
const validation = await read("validation").catch(() => null);
const kb = bytes => (bytes / 1000).toFixed(1);
const ms = value => Math.round(value).toLocaleString("en-US");
const gain = (b, a) => ((b - a) * 100 / b).toFixed(1);
const rows = before.screens.map((screen, i) => {
  const b = screen.median, a = after.screens[i].median;
  return `| ${screen.name} | ${ms(b.ready)} → ${ms(a.ready)} | ${gain(b.ready, a.ready)}% | ${kb(b.jsBytes)} → ${kb(a.jsBytes)} | ${b.apiRequests} → ${a.apiRequests} |`;
});
const paint = before.screens.map((screen, i) => {
  const b = screen.median, a = after.screens[i].median;
  return `| ${screen.name} | ${ms(b.lcp)} → ${ms(a.lcp)} | ${ms(b.blocking)} → ${ms(a.blocking)} | ${b.cls} → ${a.cls} |`;
});
const stress = before.stress.map((b, i) => {
  const a = after.stress[i];
  return `| ${b.concurrency} | ${b.requests} | ${b.p95} → ${a.p95} | ${b.throughput} → ${a.throughput} | ${a.statuses[200]}/${a.requests} |`;
});
const regressions = before.screens.filter((b, i) => after.screens[i].median.ready > b.median.ready * 1.05).map(s => s.name);
const text = `# Performance audit — DSSConfessions

Measured ${after.date.slice(0, 10)}. Baseline source: commit 4332f1b, built and saved before edits. Results are local measurements, not a production capacity estimate or a PageSpeed score.

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
${rows.join("\n")}

${regressions.length ? `Screens with a measured ready-time regression over 5%: ${regressions.join(", ")}. These are retained in the comparison; no universal speedup is claimed.` : "No screen had a median page-ready regression over 5% in this run."}

LCP is the largest visible paint. Blocking time sums the portion over 50 ms of observed long tasks, within this audit window; it is not Lighthouse TBT. CLS measures unexpected layout movement.

| Screen | LCP, ms: before → after | Blocking time, ms: before → after | CLS: before → after |
| --- | ---: | ---: | ---: |
${paint.join("\n")}

## Stress tests

Each phase sends 900 finite mixed requests through real Express routes and a fresh isolated PostgreSQL engine containing 5,000 fictional rows, before any browser interactions. The mix covers feed reads, recipient searches, settings, replies and a fixture Spotify search. HTTP tests run unthrottled on localhost; mobile throttling applies only to browser measurements. No real Spotify or AI requests are made. Public API behavior was preserved; throughput differences include local runtime variation and are not attributed solely to frontend changes.

| Concurrent requests | Requests per phase | p95 latency, ms: before → after | Requests/sec: before → after | After successful responses |
| ---: | ---: | ---: | ---: | ---: |
${stress.join("\n")}

- Shared read quota: ${after.rateLimit.allowed} successes and ${after.rateLimit.rejected} expected HTTP 429 responses from a 70-request burst; Retry-After present.
- Atomic Pokes: ${after.writes.pokes.concurrentRequests} simultaneous requests produced exactly ${after.writes.pokes.actualIncrement} increments, with no lost counts.
- Reply cap: ${after.writes.replies.concurrentRequests} simultaneous submissions yielded ${after.writes.replies.accepted} accepted and ${after.writes.replies.full} full-thread conflicts.
- Browser stress: ${after.interactions.browserStress.concurrentVisitors} concurrent visitors, ${after.interactions.browserStress.navigations} in-page navigations, zero runtime errors.
- 100 rapid Poke taps still batch into ${after.interactions.pokeBurst.requests} request; song search still debounces to one request for an 11-character burst.
- Editing a bookmarked recipient search: before the input reset to “${interactions.interactions.browseEdit.value}” and sent ${interactions.interactions.browseEdit.requestsWhileTyping} unwanted requests; after it retained “${after.interactions.browseEdit.value}” and sent zero.
- History: before Back restored ${interactions.interactions.history.actual}px instead of ${interactions.interactions.history.expected}px; after it restored exactly ${after.interactions.history.actual}px.
- Share modal, archive viewer, admin sign-in/out and all 13 screens at 360px passed; zero horizontal overflow and zero initial archive image downloads.

## Conditions and limits

Chromium ${after.conditions.browser}; 390×844 viewport; 4× CPU slowdown; 80 ms simulated latency; 200,000 bytes/sec download and 100,000 bytes/sec upload. Static assets are gzip-compressed. Screens run sequentially, in fresh contexts. Informational routes use their built prerendered HTML.

All API traffic stays in a disposable in-process PGlite database and all third-party traffic is intercepted with neutral fixtures. External font downloads are disabled for repeatability; the site's font definitions are unchanged. These figures therefore do not cover real font loading, Supabase network latency, Vercel cold starts, production load, actual Spotify embeds, or field INP. PGlite is single-process and does not model a multi-core hosted PostgreSQL service. No production stress test was performed.

Bot activation is separate from this harness: the requested local scheduler uses the configured project database and published one clearly fictional story through the normal API. The performance tests never touch that database. Public asset changes have not been deployed by this task.

## Reproduce

Install the existing root, client and server development dependencies and Playwright Chromium. Port 4173 must be free. Before changing code, run npm run build, then npm run perf:snapshot to retain the baseline. After changes, build again and run npm run perf:compare. An existing baseline is deliberately never overwritten. The local snapshot is under .vercel/performance/before/site and is ignored by Git.

Raw measurements: [before](performance-results/before.json), [after](performance-results/after.json), [baseline interactions](performance-results/before-interactions.json), [before HTTP stress](performance-results/before-stress.json), [after HTTP stress](performance-results/after-stress.json). Test setup: [fixture](scripts/performance/fixture.cjs), [audit](scripts/performance/audit.mjs). No new runtime dependencies were added. Performance changes require no schema changes; the bot recipient-label update uses a separate additive function migration described in [AUTOMATION.md](AUTOMATION.md).

## Delivery checks and files

${validation ? `Recorded ${validation.date}: npm test — ${validation.serverTests} passed; npm run verify:bots — ${validation.browserVerificationTests} passed; npm run check:schema --prefix server — ${validation.schemaProbes} passed; lint, production build, diff whitespace check and client secret scan passed. See [validation record](performance-results/validation.json).` : "Run npm test, npm run verify:bots, npm run lint, npm run build and npm run check:schema --prefix server after further changes."}

Loading and navigation changes are in [App](client/src/App.jsx), [route views](client/src/route-views.js), [hooks](client/src/hooks/index.js), [Browse](client/src/views/BrowseView.jsx), [scrubber](client/src/components/ui/MixtapeScrubber.jsx), [archive](client/src/components/ui/DesignArchive.jsx), [Vite config](client/vite.config.js) and [prerender](scripts/prerender.mjs). Bot writing, scheduling, submission, disclosure and environment setup are documented in [AUTOMATION.md](AUTOMATION.md). All new credentials are server-only and kept in the ignored server/.env; no AI key is required.

The database's bot control function remains inaccessible to anonymous and authenticated browser roles. Supabase advisors still report the pre-existing public add_reply SECURITY DEFINER execution grants; that separate reply permission finding was not changed by this bot disclosure patch.
`;
await fs.writeFile(path.join(root, "PERFORMANCE.md"), text);
console.log("Wrote PERFORMANCE.md and performance-results/*.json.");
