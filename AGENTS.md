# AGENTS.md — AI Developer & Agent Guide for DSSConfessions

This document provides architectural rules, operational constraints, and critical pitfalls for AI coding agents working on **DSSConfessions**.

---

## 1. Project Overview & Tech Stack

- **Application**: Anonymous song-confession platform for the DSSC student community ("Untold words, sent through the song").
- **Frontend**: Vite + React 19 SPA hosted on **Vercel**.
- **Backend API**: Express 5 application running as **Vercel Serverless Functions** (`api/index.js` -> `server/vercel.js` -> `server/app.js`).
- **Database**: **Supabase** (PostgreSQL) managed via service role from the backend API.
- **External Integration**: Spotify Web API (song search and server-side track metadata validation).
- **Design Language**: "Sunny Mixtape / Record Shop" neo-brutalist aesthetic (2px ink borders, offset drop shadows, soft pastel wash backgrounds, Caveat & Reenie Beanie accent fonts, Inter UI font).

---

## 2. Immutable Rules for AI Agents

1. **DO NOT change any fonts or font-families**:
   - `Caveat` and `Reenie Beanie` are accent handwriting/script fonts.
   - `Inter` is the primary sans-serif UI font.
   - `JetBrains Mono` / monospace is for receipts, numbers, timestamps, and keys.
2. **Never change existing routes or breaking API response shapes**:
   - Web routes: `/`, `/browse`, `/confess`, `/about`, `/confession/:id`.
   - Core API endpoints: `GET /api/confessions`, `POST /api/confess`, `GET /api/search-song`, `GET /api/top-searches`, `POST /api/confessions/:id/poke`.
   - Existing API response shapes must remain backward-compatible (additive fields only). Note: `alreadyPoked` was removed in the unlimited poke redesign.
3. **Strict Privacy Promise**:
   - No user accounts.
   - No raw IP storage or logging (IPs are HMAC-SHA256 hashed with `SUPABASE_SERVICE_ROLE` before rate limiting).
   - No user IDs, fingerprints, tracking beacons, or invasive analytics.
4. **Serverless Safety**:
   - Lambdas cold-start and shut down after request termination.
   - **Never store state in Node.js process memory** (no in-memory maps, caches, or rate limiters across requests).
   - All concurrency coordination, rate limiting, and counters must execute atomically inside PostgreSQL via RPC.
5. **Idempotent, Non-Destructive Migrations**:
   - **Never drop tables, columns, or data** during standard migrations.
   - Use `alter table ... add column if not exists` or guarded `do $$` blocks.
   - Always run `notify pgrst, 'reload schema';` at the end of every migration.
   - Always verify and update `npm run check:schema` (`server/scripts/check-schema.js`).
6. **Accessibility (WCAG AA)**:
   - Visible keyboard focus rings.
   - Touch targets $\ge 44\text{px}$.
   - Honor `prefers-reduced-motion` (instant scrolls, disable spinning/wiggling).
   - Ensure zero horizontal overflow at 360px viewport width.
7. **Zero New Runtime Dependencies**:
   - Do not add random npm packages. Keep the project lightweight (native React hooks, CSS, inline SVGs).

---

## 3. Architecture & Key Features

### 3.1 Routing & History Management (BUG-001 through BUG-008)
- Custom HTML5 History API router in [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx).
- Browser Back/Forward must preserve the user's exact scroll position when returning from confession details to Home or Browse.
- Modal dialogs (`Modal.jsx`, `ShareDialog.jsx`, author controls) are in-page state and **must never push a new history entry**.

### 3.2 Mixtape Scrubber & Native Scrollbar Removal
- Global native scrollbars are hidden via `html { scrollbar-width: none; } html::-webkit-scrollbar { display: none; }` and the `.no-scrollbar` utility class.
- Replaced the edge scrollbar with a bottom-center floating **Mixtape Scrubber** ([`MixtapeScrubber.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/MixtapeScrubber.jsx)).
- Includes rewind/top button, wavy SVG progress track, vinyl playhead with rotation on scroll, and pretend audio timestamp (`aria-hidden="true"`). Adheres to WAI-ARIA `role="slider"`.
- **Idle Animation**: After $1.2\text{s}$ without interaction, enters alive state: slow vinyl spin ($9\text{s}$ linear on nested wrapper), pill floating bob ($3.5\text{s}$ ease-in-out), playhead and sticker heartbeat pulse ($1.6\text{s}$), and periodic idle hearts ($3$–$6\text{s}$). Pauses on `document.hidden`.
- **Heart Particle Trail**: Playhead motion emits hearts drifting upward and swaying opposite to scroll direction. Employs a zero-allocation DOM object pool capped at $24$ active particles on desktop and $14$ on mobile/touch (`pointer: coarse`). Velocity guarded ($\ge 3\text{px}$) and throttled ($60\text{ms}$). Celebration bursts at bottom ($100\%$) and rewind.
- **Touch Device Behavior**: Dims to $70\%$ opacity in compact state when idle instead of disappearing, keeping it discoverable and showing idle animations.
- Hides automatically when the page is non-scrollable, when any dialog is open, or when the mobile navigation menu is open.

### 3.3 Unlimited & Counted Poke
- Endpoint: `POST /api/confessions/:id/poke` with body `{ "amount": N }` (1 to 100).
- Handled atomically in PostgreSQL by `poke_confession(p_confession_id uuid, p_amount int) returns bigint`.
- **No once-per-day restriction** and **no user-facing limits**.
- Protected by an **anti-flood guard** (240 requests/minute per client under scope `poke`) purely to safeguard backend lambdas and Postgres from bot attacks.
- Client ([`PokeButton.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/PokeButton.jsx)) batches rapid taps into ~400ms bursts and flushes on page exit using `keepalive: true` or `sendBeacon`.
- `poke_log` is deprecated (retained intact for backward compatibility; do not drop in standard migrations). `POKE_HASH_SECRET` is removed.

### 3.4 Modal Scroll Locking & Dropdowns
- Modal dialogs ([`Modal.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/Modal.jsx)) lock the background page from scrolling without layout shift using:
  ```javascript
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  ```
  On close, the exact scroll position is restored (`window.scrollTo({ top: scrollY, behavior: "instant" })`).
- Modals, the custom `Select` listbox, and the song-search results use `.no-scrollbar` with `.scroll-fade-hints` (`background-attachment: local`).

### 3.5 Logo System & Brand Identity
- **Mark Metaphor**: Vinyl Speech Bubble combining a speech bubble silhouette, concentric dashed record grooves (`.grooves` class for interactive rotation), an inner heart spindle hole, and a neo-brutalist tape accent.
- Located in `client/public/`:
  - `logo-mark.svg`: Full-color SVG mark with spinning grooves and pulsing heart on hover/focus.
  - `logo-mark-mono.svg`: Pure vector single-color mark using `currentColor` and `fill-rule="evenodd"` compound path cutout. **Never use SVG `<mask`> elements**.
  - `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, PWA icons (192, 512, maskable 192, 512), and `og-default.png` ($1200 \times 630$).
- React Component: [`Logo.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/Logo.jsx) supports variants `header`, `footer`, `stacked`, and `mark-only`. Wordmark uses live text in `Caveat` script font.

### 3.6 Design Archive & Footer Disclosure
- Footer disclosure panel [`DesignArchive.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/DesignArchive.jsx) documents milestone visual evolutions:
  - **v1**: Black & White Brutalist (February 2026 – August 2026)
  - **v2**: Sunny Mixtape (October 2026 – Present, current)
- Built on the premise: *"I want to improve my creativity by revamping my older projects."*
- **Zero initial image load**: Images and thumbnails are only mounted after the user clicks the disclosure button (`{isOpen && ...}`).
- **Strict Privacy**: Capture pipeline ([`scripts/capture-design-archive.mjs`](file:///c:/Coding/JavaScript/Project/dss-confessions/scripts/capture-design-archive.mjs)) intercepts all `/api/*` and CDN traffic with neutral mock data (`SAMPLE`, `ANONYMOUS`, `Sample Song`). Zero real student confessions or external art are ever captured.
### 3.7 Local SEO, GEO & AEO Architecture (DSSC & Davao del Sur)
- **Target Locality**: Digos City, Davao del Sur, Region XI, Philippines (`geo.region="PH-DAS"`, `en-PH`, `en_PH`).
- **Canonical Definition & Non-Affiliation**: *"Independent student project. Not affiliated with or endorsed by Davao del Sur State College."*
- **Disambiguation Link**: Direct link to official college portal `https://www.dssc.edu.ph/` for lost users seeking enrollment, student records, or portal login.
- **Dedicated Landing Page**: [`DsscLandingView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/DsscLandingView.jsx) at `/dssc-confessions` featuring an AEO answer box (40–60 words), portal comparison table, submission steps, name search tips, and a single `<h1>`.
- **Privacy-Guarded Indexation**: Individual `/confession/:id` posts and name search queries (`?to=`, `?search=`) are strictly `noindex`, excluded from sitemaps, and disallowed in `robots.txt`. Only 10 public informational pages are indexable.
- **Generative AI Orientation**: Root-level `llms.txt` and `llms-full.txt` provide canonical definitions, scope boundaries, and citable facts for LLMs (Perplexity, ChatGPT, Claude).
- **Static Prerender**: `scripts/prerender.mjs` runs on `npm run build` to output fully populated HTML documents into `client/dist/` for search crawlers while preserving client-side React hydration.
- **Execution Region**: `vercel.json` functions run in `sin1` (Singapore, $\sim 45\text{ms}$) instead of `syd1` for optimal Core Web Vitals in the Philippines.

### 3.8 Song Replies & Mixtape Tracklist (500-Reply Cap)
- **500-Reply Cap**: Single source of truth is `MAX_REPLIES_PER_CONFESSION = 500` in `server/config/features.js`.
- **Atomic Enforcement**: `add_reply(uuid, jsonb, text, int)` Postgres RPC locks the parent confession (`FOR UPDATE`) to avoid race conditions. With 490 existing replies, 15 concurrent replies yield exactly 10 successes (201) and 5 conflicts (409 with code `REPLIES_FULL`).
- **Fail-Soft Legacy Threads**: Legacy threads with $>500$ replies retain all existing rows without trimming; they report `canReply: false, reason: "full"`. Existing replies remain readable if replies are subsequently turned off.
- **Tracklist UI**: [`SongTracklist.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/SongTracklist.jsx) provides numbered tracks 01 through 500 with cycling pastel badges (`--sky`, `--mint`, `--lilac`, `--peach`, `--butter`, `--pink`), ten-segment capacity meter with a 500-slot count (`aria-label="${count} of ${max} reply slots filled"`), inline composer expanding at the next available track slot, dashed placeholder slots, and author management controls with confirmation modal. Render 25 rows initially, with Show more adding 25 at a time; never render 500 meter nodes.

---

## 4. Known Pitfalls for Future Agents

1. **NEVER use `overflow: hidden` on `html` or `body` to hide scrollbars**:
   Doing so breaks native scrolling completely, kills mobile momentum scrolling, and causes unwanted layout shifts. Always use `scrollbar-width: none` and `::-webkit-scrollbar { display: none }`.
2. **Modals must restore exact scroll position**:
   Toggling body styles or modal open/close without recording and restoring `window.scrollY` will pop the user back to the top of the page. Follow the exact technique in `Modal.jsx`.
3. **Poke has NO user-facing limit by design**:
   Do not add any client-side rate limits, daily quotas, or disabled states to Poke. The only limit is the server's anti-flood guard (240 req/min).
4. **Keep client-side batching in `PokeButton.jsx`**:
   Users can tap 10+ times per second. Without ~400ms burst batching, thousands of HTTP requests would overwhelm serverless concurrency quotas. Always batch taps up to 100 per request.
5. **Always fail soft on database reads**:
   If a newly added column (e.g. `poke_count`) is missing on a remote database, public confession reads must fallback to default values rather than throwing Postgres `42703` errors.
6. **Clean Schema Verification**:
   Always run `npm run check:schema --prefix server` when updating database definitions. Keep probe lists aligned with active tables and functions.
7. **Scrubber Particle Pooling & Transform Independence**:
   Never allocate new particle objects inside scroll event handlers (60+ times/sec); always recycle pre-allocated pool slots. Do not place both idle rotation and scroll-driven rotation on the same DOM element—use nested wrappers so transforms compose cleanly without snapping. Always honor `prefers-reduced-motion: reduce` by disabling both idle animations and particle emissions.
8. **Zero Real Student Data in Screenshots & Captures**:
   Never capture screenshots against live user confessions. Always route `/api/*` requests through the strict mock interceptor in `capture-design-archive.mjs`.
9. **Never Load Design Archive Assets on Page Mount**:
   Design archive screenshots must only be downloaded when the user actively opens the footer disclosure panel (`isOpen === true`). Initial bundle and page weight must remain unaffected.
10. **NEVER declare `CollegeOrUniversity` or `EducationalOrganization` schemas for this site**:
    The platform is an independent student web app. Referencing Davao del Sur State College is only done via the `about` property on community pages.
11. **NEVER index individual confession posts (`/confession/:id`) or name search queries**:
    Confession posts often contain personal student names or initials. Permitting search engine or AI crawler indexing would risk exposing private student messages in public search engine caches. Keep them `noindex` and out of `sitemap.xml`.
12. **NEVER bypass `add_reply` or hardcode reply limits**:
    Always enforce the 500-reply cap via the atomic `add_reply` RPC and reference `MAX_REPLIES_PER_CONFESSION` from `server/config/features.js`. Do not perform raw inserts that bypass row locking, and do not discard existing rows on legacy threads that exceed 500 replies.



