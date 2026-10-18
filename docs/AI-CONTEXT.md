# DSSConfessions: AI Context & Codebase Map

This document provides a comprehensive orientation for AI models and automated coding assistants working with the DSSConfessions repository.

---

## 1. System Overview & Deployment Model

DSSConfessions is an anonymous student confession board themed around music and mixtapes ("Untold words, sent through the song").

```mermaid
flowchart TD
    Client["Browser (Vite + React SPA)"]
    VercelEdge["Vercel Static & Rewrites (vercel.json)"]
    ApiLambda["Express API (/api/*) (api/index.js -> server/vercel.js)"]
    SupabaseDB[("Supabase PostgreSQL")]
    SpotifyAPI["Spotify Web API"]

    Client -->|Static Assets| VercelEdge
    Client -->|API Requests| ApiLambda
    ApiLambda -->|SQL Queries & RPCs (service_role)| SupabaseDB
    ApiLambda -->|Track Validation & Search| SpotifyAPI
```

- **Frontend**: Vite + React 19 SPA running on Vercel. Static assets are served from `client/dist`.
- **Backend API**: Express 5 serverless function running on Vercel Functions (`api/index.js` -> `server/vercel.js` -> `server/app.js`).
- **Database**: Supabase PostgreSQL database. Communication happens exclusively over `@supabase/supabase-js` using the server-only `SUPABASE_SERVICE_ROLE` key. Direct browser access to Supabase is strictly blocked.
- **External Services**: Spotify Web API proxies track search and validates Spotify track IDs before database inserts.

---

## 2. File Organization & Directory Structure

```text
dss-confessions/
├── api/
│   └── index.js                   # Vercel Serverless Function entry point
├── client/
│   ├── public/                    # Static assets, OG banner, favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Navbar, Footer
│   │   │   └── ui/                # ConfessionCard, MixtapeScrubber, PokeButton, Modal, Select, StepCard, Toast...
│   │   ├── hooks/                 # Custom React hooks (features, seo...)
│   │   ├── seo/                   # Route metadata, SEO/GEO/AEO definitions
│   │   ├── utils/                 # pastel colors, shareCard canvas generator, helpers
│   │   ├── views/                 # HomeView, BrowseView, DetailsView, SubmitView, AboutView, FaqView, PrivacyView...
│   │   ├── App.jsx                # Router, global modal receipt, toasts, MixtapeScrubber
│   │   ├── index.css              # Neo-brutalist theme, .no-scrollbar, .scroll-fade-hints, animations
│   │   └── main.jsx               # React DOM entry
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── features/                  # Deep-dive documentation on specific features (poke.md, etc.)
│   ├── ui/                        # UI system docs (scroll-scrubber.md, select.md)
│   ├── BUGS.md                    # Bug audits, history stack fixes (BUG-001 to BUG-008), pitfalls
│   ├── operations.md              # Vercel deployment, migration runbooks
│   └── CHANGELOG.md               # Chronological log of major architectural changes
├── server/
│   ├── config/                    # Feature configuration and limiter thresholds
│   ├── scripts/                   # check-schema.js database probe
│   ├── test/                      # Node.js native test runner test suite (api.test.js, features.test.js, schema.test.js)
│   ├── utils/                     # Hashing, rate limiting, Spotify client, delete keys
│   ├── app.js                     # Express app instance, middleware, route handlers
│   ├── features.js                # Author controls, report handling, unlimited poke API
│   ├── vercel.js                  # Vercel serverless adapter with waitUntil background promise tracking
│   └── package.json
├── supabase/
│   ├── migrations/                # Versioned SQL migrations (rate limits, indexes, features, unlimited poke)
│   └── trending-searches.sql      # Trending search term RPCs
├── AGENTS.md                      # AI developer guidelines and core rules
├── vercel.json                    # Routing rewrites, header security policies, function configs
└── README.md
```

---

## 3. Core Architectural Mechanisms

### 3.1 Custom History-API Router & Scroll Restoration
- Located in [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx).
- Operates without external router dependencies (no `react-router-dom`).
- Uses standard `window.history.pushState` and `window.history.replaceState`.
- Preserves exact scroll coordinates on navigation (captured on route departure, restored on `popstate`).
- **RULE**: Modals, popups, and dropdowns are local React state; they **never push history entries**.

### 3.2 Floating Mixtape Scrubber & Hidden Scrollbars
- Replaced styled edge scrollbars with a centered floating pill: [`client/src/components/ui/MixtapeScrubber.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/MixtapeScrubber.jsx).
- Displays:
  1. Rewind button (`aria-label="Back to top"`, smooth scroll).
  2. Wavy SVG progress track filled dynamically with `--primary`.
  3. Mini vinyl playhead riding the track, spinning on scroll velocity (`role="slider"`).
  4. Decorative audio timestamp (`aria-hidden="true"`).
- Global scrollbars are hidden via `html { scrollbar-width: none; }` and `.no-scrollbar`.
- Auto-hides on non-scrollable pages, during open dialogs/modals, or when mobile nav menu is opened.

### 3.3 Modal Scroll Lock
- Located in [`client/src/components/ui/Modal.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/Modal.jsx).
- Locks body scroll without layout shift using:
  ```javascript
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  ```
- Restores exact `window.scrollY` on dialog close.
- Features CSS top/bottom fade hints (`.scroll-fade-hints`) using `background-attachment: local`.

### 3.4 Unlimited Poke & Client Burst Batching
- Every tap counts; there is no once-per-day restriction and no user-facing cap.
- Client ([`PokeButton.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/PokeButton.jsx)) batches bursts of taps over 400ms into a single `POST /api/confessions/:id/poke` request `{ "amount": N }`.
- Flushes immediately on page leave using `navigator.sendBeacon` or `fetch(..., { keepalive: true })`.
- Handled atomically in PostgreSQL via `poke_confession(p_confession_id uuid, p_amount int) returns bigint`.
- Protected by an anti-flood guard (240 req/min per client) purely to protect serverless resources.
- `poke_log` is deprecated and no longer written to. `POKE_HASH_SECRET` is removed.

### 3.5 Logo System & Brand Architecture
- Mark: Vinyl Speech Bubble combining speech bubble silhouette, concentric vinyl record grooves (`.grooves` spinning on hover/focus), inner heart spindle hole, and neo-brutalist tape accent.
- Located in `client/public/`:
  - `logo-mark.svg`: Full-color SVG mark with CSS spinning micro-interaction.
  - `logo-mark-mono.svg`: Pure vector single-color mark using `currentColor` and `fill-rule="evenodd"` compound path cutout. **No SVG `<mask`> elements**.
  - Favicons & PWA icons: `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, and `og-default.png` ($1200 \times 630$).
- React Component: [`Logo.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/Logo.jsx) supports variants `header`, `footer`, `stacked`, and `mark-only`. Wordmark is live text in `Caveat` script font.

### 3.6 Design Archive & Footer Disclosure
- Footer disclosure panel [`DesignArchive.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/DesignArchive.jsx) documents milestone visual evolutions:
  - **v1**: Black & White Brutalist (February 2026 – August 2026)
  - **v2**: Sunny Mixtape (October 2026 – Present, current)
- Philosophy: *"I want to improve my creativity by revamping my older projects."*
- **Zero initial image overhead**: Archive images and thumbnails are lazy-loaded only when the user expands the disclosure panel (`{isOpen && ...}`).
- **Privacy Guarantee**: Intercepts `/api/*` and Spotify CDNs with neutral mock data (`SAMPLE`, `ANONYMOUS`, `Sample Song`). Zero real student confessions or external art are ever captured.
- Includes accessible lightbox dialog [`DesignArchiveLightbox.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/DesignArchiveLightbox.jsx) with keyboard navigation (`Esc`, arrows), scroll locking, and image preloading.

---

## 4. Crucial Pitfalls for AI Models

1. **Never use `overflow: hidden` to hide scrollbars**:
   Applying `overflow: hidden` to `html` or `body` completely disables scrolling on desktop and mobile. Always use `scrollbar-width: none` and `::-webkit-scrollbar { display: none }`.
2. **Modals must restore exact scroll position**:
   Always record `window.scrollY` before fixing body positioning and call `window.scrollTo({ top: scrollY, behavior: "instant" })` upon close.
3. **Poke has NO user-facing limit**:
   Do not disable the Poke button or add daily limits. The server limiter (240 req/min) is strictly an anti-flood safeguard against bots.
4. **Keep batching in the Poke client**:
   Always debounce rapid taps (~400ms burst) and cap per request at 100 to prevent lambda exhaustion.
5. **Preserve fonts**:
   Never replace or alter fonts defined in `client/src/index.css` (`Caveat`, `Reenie Beanie`, `Inter`, `JetBrains Mono`).
6. **Zero real student data in screenshot captures**:
   Never take screenshots against live production confessions. All network requests must be mocked via `capture-design-archive.mjs`.
7. **Never mount design archive images on initial page load**:
   Ensure screenshots remain unmounted until the footer disclosure panel is actively opened.


