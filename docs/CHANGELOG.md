# DSSConfessions Changelog

All notable changes to the DSSConfessions platform are documented in this file.

---

## [Unreleased] — 2026-10-18

### Added: Design Archive ("Why I keep older designs here")
- **Creative Revamp Disclosure**: Added a dedicated footer section (`DesignArchive.jsx`) displaying the evolutionary timeline of platform designs, explaining the author's creative philosophy: *"I want to improve my creativity by revamping my older projects."*
- **Milestone Version History**:
  - `v1` (Black & White Brutalist, February 2026 – August 2026)
  - `v2` (Sunny Mixtape, October 2026 – Present, Current)
  *(Intermediate exploratory scratch restyles like Record Shop are omitted from public display).*
- **Strict Privacy Guarantees**: Intercepted all `/api/*` and Spotify CDN calls in `scripts/capture-design-archive.mjs` to ensure zero real student confessions or third-party assets are captured. Verified by automated tests.
- **Accessible Lightbox**: Keyboard-first interactive lightbox (`DesignArchiveLightbox.jsx`) with `Esc`, arrow keys, desktop/mobile toggles, background scroll lock, and adjacent image preloading.
- **Zero Initial Weight**: Screenshots are only rendered upon user interaction (`isOpen === true`).

### Added: New Brand Logo System ("Vinyl Speech Bubble")
- **Brand Mark Metaphor**: Speech bubble silhouette + concentric grooved vinyl record + inner heart spindle hole + neo-brutalist tape accent.
- **Asset Suite**: Full-color `logo-mark.svg`, single-color `logo-mark-mono.svg` (pure vector compound path with `fill-rule="evenodd"`, no `<mask`>), `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, PWA icons (192, 512, maskable 192, 512), and `og-default.png` ($1200 \times 630$).
- **`<Logo />` Component**: Unified React component (`Logo.jsx`) supporting `header`, `footer`, `stacked`, and `mark-only` variants. Grooves rotate and heart pulses on hover/focus (disabled under `prefers-reduced-motion`). Live-text wordmark in `Caveat` script font.
- **Technical SEO & Automation**: Automated asset generation via `npm run brand:build` and CI validation via `npm run seo:check`.

### Changed: Unlimited & Counted Poke Interaction
- **Unlimited Taps**: Replaced the previous 1-poke-per-day restriction with an unlimited, cumulative tapping model. Every tap counts towards the confession's public poke total.
- **Permanent Button Interactivity**: Removed the disabled "already poked" state and `alreadyPoked` API response property. The Poke button remains permanently interactive.
- **Client-Side Burst Batching**: Implemented ~400ms burst batching in `PokeButton.jsx`. Up to 100 taps are coalesced into a single `POST /api/confessions/:id/poke` request `{ "amount": N }`.
- **Page Exit Flush**: Pending taps flush automatically on tab close or backgrounding via `navigator.sendBeacon` or `fetch(..., { keepalive: true })`.
- **Snappy Optimistic UI**: Instant count increment on tap, "boop" button wiggle, and floating combo bubbles (`+1`, `+2`, ... `+N`). Failed batches roll back only the unsent amount and surface a toast.
- **Accessibility**: Added `aria-label` displaying current poke count; `aria-live="polite"` announces once per batch instead of per tap. Reduced motion disables animations.
- **Anti-Flood Protection**: Replaced strict user rate-limiting with a generous anti-flood guard (240 requests/minute per client under scope `poke`) to shield the serverless backend from automated bot abuse.
- **Identity Cleansing**: Removed all poker hashing, IP collection, and the `POKE_HASH_SECRET` environment variable requirement.
- **Database Schema**:
  - Migration `20261018130000_unlimited_poke.sql`: Altered `confessions.poke_count` to `bigint not null default 0`.
  - Created atomic RPC `poke_confession(p_confession_id uuid, p_amount int default 1) returns bigint`.
  - Deprecated `poke_log` without dropping data.

### Changed: Mixtape Scrubber (Idle Animation & Heart Particle Trail)
- **Idle Alive State**:
  - Automatically triggers after 1.2s of inactivity (no scroll, drag, hover, or focus).
  - Vinyl disc slowly spins (1 revolution per 9s, linear) on an independent nested wrapper without conflicting with scroll-driven rotation.
  - Gentle floating bob animation on the pill (`translateY` 0 to -3px, 3.5s ease-in-out).
  - Soft heartbeat pulse (`scale` 1 to 1.1 to 1, 1.6s) on the playhead disc and pill heart sticker.
  - Periodic gentle idle heart drifts up every 3–6s (randomized).
  - Pauses immediately on `document.hidden` (Page Visibility API) to conserve battery and CPU.
- **Heart Particle Trail**:
  - Playhead motion emits hearts drifting upward (24–56px) and swaying opposite to scroll direction.
  - Visuals: inline SVG hearts cycling through neo-brutalist theme colors (`--coral`, `--pink`, `--lilac`, `--primary`).
  - Performance & Pooling: pre-allocated zero-allocation DOM pool capped at 24 particles on desktop and 14 on mobile (`pointer: coarse`).
  - Velocity-guarded: requires $\ge 3\text{px}$ movement and throttles to at most 1 heart per 60ms.
  - Celebrations: burst of 8 hearts on reaching bottom of page (100%) and on clicking rewind / back-to-top button.
- **Touch Device Dimming**:
  - Instead of disappearing 1.5s after touch scrolling stops, the scrubber dims to 70% opacity in a compact pill state, remaining discoverable while showing the idle animation.
- **Reduced Motion & A11y**:
  - All particles are `aria-hidden="true"`, `pointer-events: none`.
  - Strict compliance with `prefers-reduced-motion: reduce`: completely disables idle animations and heart particles.

### Added: Floating Mixtape Scrubber
- **Mixtape Scrubber Component** (`MixtapeScrubber.jsx`): Mounted at the app root, floating at the bottom center of the viewport.
  - Rewind-to-top button with 44px tap target.
  - Inline SVG wavy track dynamically filled with `--primary` based on scroll progress.
  - Draggable mini vinyl playhead riding the track, spinning in response to scroll velocity.
  - Decorative audio timestamp (`mm:ss`, pretend 3:30 track, `aria-hidden="true"`).
- **Accessibility**: Playhead conforms to WAI-ARIA `role="slider"` with complete keyboard navigation (`ArrowUp/Down`, `PageUp/Down`, `Home`, `End`).
- **Contextual Hiding**: Automatically hides when the page has $\le 20\text{px}$ scrollable overflow, when any modal/dialog is open, or when the mobile menu is open. Auto-fades out 1.5s after touch scrolling stops.
- **Bottom Footer Padding**: Added `pb-28` to the application footer so the floating scrubber never obscures interactive content or buttons.

### Changed: Universal Native Scrollbar Hiding
- **Native Scrollbar Removal**: Completely hid native scrollbars site-wide using `html { scrollbar-width: none; } html::-webkit-scrollbar { display: none; }` without disabling scrolling.
- **Reusable Utility Class**: Added `.no-scrollbar` for zero-scrollbar scrolling on child containers.
- **Forced Colors Support**: Re-enabled standard system scrollbars when `forced-colors: active` (Windows High Contrast Mode) is detected.

### Changed: Modal Scroll Lock & List Enhancements
- **Layout-Shift-Free Modal Scroll Lock**: `Modal.jsx` now uses `position: fixed; top: -scrollY; width: 100%; paddingRight: scrollbarWidth` to lock background scrolling without horizontal shift, restoring exact scroll position on close.
- **CSS-Only Soft Fade Hints**: Added `.scroll-fade-hints` using `background-attachment: local` to `Modal.jsx`, `Select.jsx` listbox, and `SubmitView.jsx` song search dropdown.
- **Auto-Growing Textareas**: Confession message textarea in `SubmitView.jsx` auto-expands up to 360px before scrolling with a hidden scrollbar.

---

## [Previous Releases]

### 2026-10-18: Vercel Serverless Migration & Rate Limiting
- Migrated backend API from Render to Vercel Functions (`api/index.js` -> `server/vercel.js`).
- Implemented distributed rate limiting inside Supabase (`app_private.api_rate_limits` and `consume_api_rate_limit`).
- Added performance indexes for confession queries (`idx_confessions_created_at_desc`, `idx_confessions_recipient_to_trgm`).
- Fixed navigation history stack bug (BUG-001) ensuring browser Back restores origin views and scroll position.

### 2026-10-18: Anonymous Safety & Author Features
- Added one-time delete keys (`delete_key_hash` using PBKDF2 with server pepper).
- Added community moderation reporting (`reports` table and atomic `report_confession` RPC).
- Added author-controlled song reply threads (`replies` table and atomic reply RPCs).
- Added Dynamic Open Graph preview cards for shared confessions.

