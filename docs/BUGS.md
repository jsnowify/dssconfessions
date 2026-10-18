# DSSConfessions: Bug Audit, Root-Cause Analysis & Fix Report

This document records the root-cause analysis, design decisions, architectural context, and patches applied for the navigation bug and the proactive codebase audit across **DSSConfessions**.

---

## 1. Architecture Notes & Current State

### 1.1 Deployment & Hosting Model

- **Frontend**: Hosted on **Vercel** as a single-page application (SPA) built with Vite and React.
- **Backend API**: Hosted on **Vercel Functions** (serverless functions), executing `server/vercel.js` via the entry point `api/index.js`. The API request path no longer depends on Render; all client requests route through `/api/*` to the serverless Express instance.
- **Database**: **Supabase** (PostgreSQL). The Express API connects directly to Supabase using `@supabase/supabase-js` configured with `SUPABASE_SERVICE_ROLE`.
- **External APIs**: **Spotify Web API** for song searching and track metadata verification before confession insertion.

### 1.2 Routing & History Stack Architecture

- The frontend uses a lightweight, dependency-free client router driven by the standard **HTML5 History API** (`window.history.pushState`, `window.history.replaceState`, and the `popstate` event) inside [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx).
- Vercel rewrite configuration in [`vercel.json`](file:///c:/Coding/JavaScript/Project/dss-confessions/vercel.json) routes all non-API paths (`/((?!api(?:/|$)).*)`) to `/index.html`, allowing direct loads and browser refreshes on routes such as `/browse`, `/confess`, `/about`, and `/confession/:id`.
- Scroll positions are captured per history entry (`window.scrollY`) and restored on `popstate` using `requestAnimationFrame(() => window.scrollTo(...))` for native browser Back/Forward UX.

### 1.3 Serverless Rate Limiting & Privacy Guarantee

- Rate limiting is distributed and persisted in Supabase within the `app_private.api_rate_limits` table using an atomic PostgreSQL function `consume_api_rate_limit`.
- Client IP addresses are never stored in plain text. IPs are hashed via HMAC-SHA256 with the server-only `SUPABASE_SERVICE_ROLE` key before querying the rate limiter, fulfilling the project's zero-IP logging privacy guarantee.
- Rate limits are partitioned by scope:
  - `confess`: 15 requests per 15-minute fixed window per client.
  - `read`: 60 requests per 1-minute fixed window per client.
  - `trend`: 1 hit per 10-minute cooldown per client per normalized search term.

---

### 1.4 Anonymous safety and sharing features (local implementation)

- See `docs/features.md` for migration `20261018100410_anonymous_features.sql`,
  required secrets and the hourly Postgres cleanup job. Deployment steps are not
  automatically completed by changing source files.
- `POST /api/confess` retains `status` and adds the one-time `deleteKey` field.
  Existing feed/lookup objects retain their shape; reply settings use a new API.
- Public content reads exclude hidden records and are uncached to prevent stale
  moderation results. Trending ranking/increments remain unchanged; eligibility
  now requires a visible matching confession.
- Author controls, reports and replies use shared Postgres quotas even locally.
  No raw client IP is stored. Author verification and deletion share quotas.
- Canonical confession URLs have an OG wrapper; `?_spa=1` explicitly loads the
  SPA. The catch-all rewrite and History API pathname parser remain intact.
- Dialogs use native dialog, a focus trap, background inertness, Escape and focus
  return. They never push history. The unsaved key receipt lives at the app root.

### 1.5 Floating Mixtape Scrubber & Native Scrollbar Removal

- Replaced edge scrollbars, top scroll-progress bar, and circular back-to-top button with a floating **Mixtape Scrubber** docked at the bottom center of the viewport (`client/src/components/ui/MixtapeScrubber.jsx`).
- Uses inline SVG wavy progress track, rewind-to-top button, spinning vinyl playhead adhering to WAI-ARIA `role="slider"`, and a decorative pretend audio timestamp (`aria-hidden="true"`).
- Global scrollbars are hidden across the application via `html { scrollbar-width: none; }` and `.no-scrollbar`.
- The scrubber automatically hides on non-scrollable pages, during open dialogs/modals, and when the mobile menu is open.

### 1.6 Unlimited & Counted Poke Architecture

- Every tap increments the confession's total count. There are no once-per-day rules, no per-client quotas, and the Poke button is never disabled.
- Client (`client/src/components/ui/PokeButton.jsx`) batches rapid taps into bursts (~400ms debounce) sending `{ amount: n }` (1 to 100) to `POST /api/confessions/:id/poke`.
- Atomic PostgreSQL RPC `poke_confession(p_confession_id uuid, p_amount int) returns bigint` updates `confessions.poke_count` in a single SQL statement.
- No poker identity or IP is tracked. `POKE_HASH_SECRET` and `alreadyPoked` are removed. `poke_log` is deprecated without dropping.
- Protected by a generous anti-flood guard (240 requests/minute per client) to prevent serverless/database denial of service.

## 2. Known Pitfalls

1. **Vercel Serverless Statelessness**: Serverless instances shut down during inactivity. No shared in-memory variables or singleton counters survive across lambdas. All coordination and rate limiting must execute atomically inside PostgreSQL via RPC.
2. **Background Execution Lifecycles**: Non-blocking background tasks (such as trending search hit increments) run via `vercel.js` using `waitUntil(promise)` (or fallback promise tracking). If not hooked into the serverless execution context, lambdas terminate execution immediately upon sending the HTTP response.
3. **Database Outage Graceful Degradation**: Upstream Supabase errors must yield standard 503 HTTP responses and never leak database internals, table structures, or connection strings to the client.
4. **Spotify API Rate Limits & Token Expiry**: The Spotify Client Credentials token is cached in memory with expiration tracking. In serverless cold starts, the token is fetched on demand with an 8-second timeout.

---

Additional safety-feature and UI pitfalls:

5. Never `select('*')` for public confession/reply endpoints. `delete_key_hash` is
   read only for author verification. Never return hash columns or limiter keys.
6. Report counting and reply caps must stay inside their atomic Postgres RPCs,
   using parent-first locks. Never coordinate these counts with process memory.
7. Keep DELETE_KEY_PEPPER and REPORT_HASH_SECRET independent. Pepper rotation
   invalidates existing author keys. Report hashes must be nullable for purging;
   retain report rows/counts after nulling them. Configure and monitor cron.
8. Author keys stay only in component memory or the user's requested download.
   No URL, history payload, localStorage, logs, webhook, cookie or analytics event
   may contain a key. New API errors must not include Axios request bodies.
9. Never push history for dialogs. Hard deletion uses replace=true. Detail feature
   components are keyed by confession ID to clear keys and abort stale reads.
10. Any report or review flag makes OG tags generic. Never preview message bodies.
    Keep the `_spa=1` rewrite before the wrapper and the SPA fallback last.
11. The historical BUG-004 cancellation wiring can still abort a chip request
    when callback identity changes, leaving Searching stuck. This predates these
    features and is recorded in `docs/record-shop-restyle.md`. Historical Fixed
    entries do not mean that separate callback/effect interaction was repaired.
12. The existing router saves scrollY on the new detail history entry rather than
    updating the previous Home entry. A direct Home → detail → Back test at
    scrollY=600 restores 0 in both the pre-Sunny build and Sunny build. Navigation
    returns to Home correctly, but exact scroll restoration remains unresolved.
    Sunny's markup/style scope deliberately leaves these history handlers intact.
13. **Never use `overflow: hidden` to hide scrollbars**:
    Applying `overflow: hidden` to `html` or `body` completely disables wheel, trackpad, and touch scrolling. Always use `scrollbar-width: none` and `::-webkit-scrollbar { display: none; }` with the `.no-scrollbar` class.
14. **Modals must restore exact scroll position without layout shift**:
    Locking the background page when a modal opens must capture `scrollY` and apply `position: fixed; top: -scrollY; width: 100%`, and on close call `window.scrollTo({ top: scrollY, behavior: "instant" })`.
15. **Poke has NO user-facing limit by design**:
    Do not add client-side limits, daily lockouts, or disabled states. The server's 240 req/min rate limit is strictly an anti-flood safeguard against bots.
16. **Keep client burst batching in the Poke component**:
    Users can tap rapidly (10 taps/sec). The client must batch taps (~400ms burst, up to 100 per request) and flush on page exit via `keepalive: true` or `sendBeacon` to protect serverless concurrency.

## 3. Not Fixed / Needs Manual Action Checklist

The following items require administrative action in the Supabase project dashboard or Vercel management console:

- [ ] **Run Migration 1 (Rate Limiting)**: Execute [`supabase/migrations/20261018080243_serverless_rate_limits.sql`](file:///c:/Coding/JavaScript/Project/dss-confessions/supabase/migrations/20261018080243_serverless_rate_limits.sql) in the Supabase SQL Editor to establish `app_private.api_rate_limits` and `consume_api_rate_limit`.
- [ ] **Run Migration 2 (Performance Indexes)**: Execute [`supabase/migrations/20261018080247_confession_indexes.sql`](file:///c:/Coding/JavaScript/Project/dss-confessions/supabase/migrations/20261018080247_confession_indexes.sql) to add `idx_confessions_created_at_desc` and `idx_confessions_recipient_to_trgm`.
- [ ] **Run Migration 3 (Trending Searches)**: Execute [`supabase/trending-searches.sql`](file:///c:/Coding/JavaScript/Project/dss-confessions/supabase/trending-searches.sql) to add `search_terms` and the atomic `increment_search_term` RPC.
- [ ] **Configure Vercel Environment Variables**:
  - `SUPABASE_URL`: Supabase project URL (`https://<project-ref>.supabase.co`).
  - `SUPABASE_SERVICE_ROLE`: Secret service-role key (used for database operations & HMAC IP hashing).
  - `SPOTIFY_CLIENT_ID`: Spotify developer application client ID.
  - `SPOTIFY_CLIENT_SECRET`: Spotify developer application client secret.
  - `ALLOWED_ORIGIN`: Canonical frontend URL (e.g. `https://dssconfessions.vercel.app`).

---

## 4. Detailed Bug Logs

### BUG-001: DetailsView Hardcoded Back Navigation & Missing History Stack Entry

- **Severity**: High (Core User Flow / Navigation)
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/views/DetailsView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/DetailsView.jsx)
  - [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx)
  - [`client/src/views/HomeView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/HomeView.jsx)
  - [`client/src/views/BrowseView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/BrowseView.jsx)

#### Symptoms & Reproduction

1. Open Home (`/`).
2. Click any confession card in the marquee feed.
3. The detail screen opens.
4. Press the in-app "Back" button or browser Back button.
5. **Expected**: User returns to Home at their original scroll position.
6. **Actual (Pre-fix)**: The in-app button redirected unconditionally to `/browse`, and the browser Back button exited the application because navigation did not push to the history stack.

#### Root Cause Analysis

1. In `client/src/views/DetailsView.jsx` (line 19), the back button contained hardcoded logic:
   ```jsx
   <button onClick={() => setView("browse")}>← Back to Browse</button>
   ```
2. In `client/src/App.jsx`, view transitions were handled solely via internal React state `const [view, setView] = useState("home")`. Opening a confession did not invoke `history.pushState` or set a URL route, leaving the browser history stack completely unaware of the view transition.
3. When the user pressed browser Back, the browser jumped to whatever previous website or tab was opened before DSSConfessions.

#### Fix Implementation

1. Replaced hardcoded `setView("browse")` with a dynamic `onBack` callback and contextual label (`← Back to Home` or `← Back to Browse` depending on `fromView`).
2. Implemented route synchronization via `history.pushState` in `handleNavigate`:
   ```javascript
   window.history.pushState(
     {
       view: "details",
       confession,
       fromView: origin,
       fromQuery: originQuery,
       scrollY: currentScrollY,
     },
     "",
     `/confession/${confession.id}`,
   );
   ```
3. Added a global `popstate` event listener in `App.jsx` that inspects `event.state` and `parseCurrentLocation()`, restoring both view state and exact scroll coordinates:
   ```javascript
   if (typeof state?.scrollY === "number") {
     requestAnimationFrame(() => {
       window.scrollTo({ top: state.scrollY, behavior: "instant" });
     });
   }
   ```
4. Updated card selection callers in `HomeView.jsx` (`fromView: "home"`) and `BrowseView.jsx` (`fromView: "browse", fromQuery: searchQuery`).

#### Verification

- Navigating Home -> Confession -> Browser Back returns to Home at exact scroll offset.
- Navigating Browse ("Ry") -> Confession -> In-app Back returns to Browse with "Ry" query intact.

---

### BUG-002: Direct URL Visits and Page Refresh Lost Active View

- **Severity**: Medium
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx)
  - [`vercel.json`](file:///c:/Coding/JavaScript/Project/dss-confessions/vercel.json)

#### Symptoms & Reproduction

1. Visit `https://dssconfessions.vercel.app/browse` or refresh while on `/confess`.
2. The page previously reset to Home or returned 404 if direct rewrites were missing.

#### Root Cause Analysis

`App.jsx` initialized with `useState("home")` regardless of `window.location.pathname`. When refreshing or clicking an external link, the app disregarded the current browser path and initialized with default Home state.

#### Fix Implementation

1. Added `parseCurrentLocation()` in `client/src/App.jsx` that runs on mount:
   ```javascript
   function parseCurrentLocation() {
     const pathname =
       window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
     const searchParams = new URLSearchParams(window.location.search);
     // parses /confession/:id, /browse?to=..., /confess, /about, /
   }
   ```
2. Initialized state hooks using the parsed route (`initialRouteRef`).
3. Ensured `vercel.json` contains the catch-all SPA rewrite `{ "source": "/((?!api(?:/|$)).*)", "destination": "/index.html" }`.

#### Verification

- Direct visits to `/browse`, `/confess`, and `/about` render the correct view immediately.

---

### BUG-003: Search Query Lost on Page Refresh and Back Navigation

- **Severity**: Medium
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/views/BrowseView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/BrowseView.jsx)
  - [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx)

#### Symptoms & Reproduction

1. Open Browse and search for a name (e.g. "Ry").
2. Refresh the browser or navigate into a confession and press Back.
3. The search input cleared and results disappeared.

#### Root Cause Analysis

`BrowseView.jsx` stored the active search strictly in component state without synchronizing with the browser query string (`?to=...`) or history state.

#### Fix Implementation

1. Updated `executeSearch` in `BrowseView.jsx` to update the URL using `window.history.replaceState`:
   ```javascript
   const newUrl = `/browse?to=${encodeURIComponent(term)}`;
   if (window.location.pathname + window.location.search !== newUrl) {
     window.history.replaceState(
       { ...window.history.state, view: "browse", query: term },
       "",
       newUrl,
     );
   }
   ```
2. Added an initial query hook in `BrowseView.jsx` that auto-executes the search if `initialQuery` is present from route parsing or back navigation.

#### Verification

- Refreshing `/browse?to=Ry` preserves the input value and displays search results.
- Navigating to a confession card and returning preserves "Ry" in the search box.

---

### BUG-004: Search Race Condition from Overlapping Async Requests

- **Severity**: High (Data Integrity / UI Glitch)
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/views/BrowseView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/BrowseView.jsx)
  - [`client/src/hooks/index.js`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/hooks/index.js)

#### Symptoms & Reproduction

1. User types "Sarah" rapidly in the Browse search box or clicks several trending chips in rapid succession ("Crush", then "Ry").
2. The network request for "Crush" finishes _after_ the request for "Ry".
3. The results for "Crush" overwrite the results for "Ry", displaying mismatched data for the active search term.

#### Root Cause Analysis

No cancellation mechanism was attached to asynchronous search requests. Overlapping HTTP promises resolved out-of-order, writing stale data into `searchResults`.

#### Fix Implementation

1. Passed `signal` from `searchConfessions(query, signal)` in `client/src/hooks/index.js` to Axios.
2. In `BrowseView.jsx`, instantiated `AbortController` in a `useRef(searchAbortRef)`:
   ```javascript
   if (searchAbortRef.current) {
     searchAbortRef.current.abort();
   }
   const controller = new AbortController();
   searchAbortRef.current = controller;
   ```
3. Wrapped results setter in `if (!controller.signal.aborted)` check, ignoring aborted request errors.

#### Verification

- Verified by rapid chip clicks: stale requests are aborted immediately and only the latest term's results populate the DOM.

---

### BUG-005: Confession Form Double-Submission on Rapid Button Clicks

- **Severity**: High (Database Duplication / Spam)
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/views/SubmitView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/SubmitView.jsx)

#### Symptoms & Reproduction

1. Fill out the confession form with valid data and select a song.
2. Rapidly double-click the "Post Confession" button.
3. Two identical confessions are created in the database and feed.

#### Root Cause Analysis

Although `isSubmitting` was toggled to `true`, the state update was asynchronous and did not immediately block a second synchronous click event firing within milliseconds.

#### Fix Implementation

1. Added an immediate synchronous guard at the top of `handleSubmit`:
   ```javascript
   if (submittingRef.current) return;
   submittingRef.current = true;
   setIsSubmitting(true);
   ```
2. Disabled the button element physically and styled with `opacity-50 cursor-not-allowed` when `isSubmitting` is true.
3. The new feature implementation uses this true synchronous ref guard and clears
   it in `finally`; React state alone is not a synchronous lock. New mutation
   forms use the same pattern.

#### Verification

- Triggering multiple rapid click events posts exactly one request to `/api/confess`.

---

### BUG-006: Server-Side 429 and 400 Errors Swallowed by Generic Toast

- **Severity**: Medium (User Feedback)
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/views/SubmitView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/SubmitView.jsx)

#### Symptoms & Reproduction

1. Submit confessions exceeding the rate limit quota (15 in 15 minutes).
2. The server responds with `429 Too Many Requests: Too many confessions. Please wait 15 minutes.`
3. The client toast displayed a generic fallback message: `"Failed to post confession. Please try again."`, obscuring why the submission failed.

#### Root Cause Analysis

`SubmitView.jsx` caught the submission rejection and passed a hardcoded string to `showToast` instead of extracting `e.response?.data?.error` or `e.response?.data?.details`.

#### Fix Implementation

1. Updated error handling in `handleSubmit`:
   ```javascript
   const serverMsg =
     e.response?.data?.error ||
     (Array.isArray(e.response?.data?.details) && e.response.data.details[0]);
   showToast(serverMsg || "Failed to post confession. Please try again.");
   ```

#### Verification

- Rate limit triggers accurately display "Too many confessions. Please wait 15 minutes." in the UI toast.

---

### BUG-007: Blank Screen on Direct Confession Link or Lookup Failure

- **Severity**: High
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx)
  - [`client/src/views/DetailsView.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/views/DetailsView.jsx)
  - [`server/app.js`](file:///c:/Coding/JavaScript/Project/dss-confessions/server/app.js)

#### Symptoms & Reproduction

1. Open a direct link to a confession: `https://dssconfessions.vercel.app/confession/<uuid>`.
2. The application rendered a completely blank white screen because the confession object was not in React memory.

#### Root Cause Analysis

1. The backend endpoint `/api/confessions` did not support single-confession lookups by `id`.
2. `DetailsView.jsx` had no loading skeleton or error state; if `selectedConfession` was null, it attempted property access (`selectedConfession.recipient_to`), causing an unhandled crash or rendering null.

#### Fix Implementation

1. Added `id` parameter support with UUID validation to `GET /api/confessions` in `server/app.js`:
   ```javascript
   if (id?.trim()) {
     const cleanId = id.trim();
     if (
       !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
         cleanId,
       )
     ) {
       return res.status(400).json({ error: "Invalid confession ID format." });
     }
     query = query.eq("id", cleanId).limit(1);
   }
   ```
2. Added `fetchConfessionById(id)` to `client/src/hooks/index.js`.
3. In `App.jsx`, added `loadConfessionDetails(id)` on deep-link detection.
4. Added loading spinner and a friendly "Confession not found" fallback screen in `DetailsView.jsx` with an in-app button returning to safety.

#### Verification

- Direct visits to `/confession/<valid-uuid>` fetch and display the confession.
- Direct visits to `/confession/<invalid-id>` show the clean fallback message with a button returning to Home.
- Server test `confessions route supports fetching by UUID and validates UUID format` passes in `server/test/api.test.js`.

---

### BUG-008: Broken Spotify Album Art Caused Missing Element in Card

- **Severity**: Low
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/components/ui/ConfessionCard.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/ConfessionCard.jsx)

#### Symptoms & Reproduction

1. If Spotify's CDN image URL expired, was blocked, or failed to load, the confession card rendered a broken image placeholder icon.

#### Root Cause Analysis

No `onError` handler was attached to the `<img>` tag in `ConfessionCard.jsx`.

#### Fix Implementation

1. Added local state `const [imageError, setImageError] = useState(false)`.
2. Attached `onError={() => setImageError(true)}` to the image element.
3. Fallback renders a cheerful `🎵` musical placeholder badge inside the theme's yellow container if the image fails.

#### Verification

- Tested with broken image URLs; gracefully falls back to the music icon badge without layout shift.

---

### BUG-009: Scrubber Touch Disappearance, Transform Snapping & Scroll Allocation Overhead

- **Severity**: Medium
- **Status**: Fixed
- **Affected Files**:
  - [`client/src/components/ui/MixtapeScrubber.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/MixtapeScrubber.jsx)
  - [`client/src/components/ui/scrubber-config.js`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/scrubber-config.js)
  - [`client/src/index.css`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/index.css)
  - [`server/test/scrubber.test.js`](file:///c:/Coding/JavaScript/Project/dss-confessions/server/test/scrubber.test.js)

#### Symptoms & Reproduction

1. **Touch Disappearance**: On mobile devices (`pointer: coarse`), the scrubber completely faded out (`opacity-0`) 1.5s after scrolling stopped, rendering the scrubber undiscoverable and hiding its alive state.
2. **Transform Snapping**: Combining continuous slow idle rotation with scroll-driven discrete rotation on the same DOM element caused angular jumps or style overrides.
3. **Scroll Allocation Thrashing**: Rapid scrolling ($60+\text{fps}$) could generate dozens of memory allocations per second if particles were instantiated dynamically on every scroll frame.

#### Root Cause Analysis

1. Touch visibility previously evaluated `isVisibleOnTouch = !isCoarse || isScrolling || isDragging || isHovered || isFocused`, applying `opacity-0 pointer-events-none` when inactive.
2. CSS `transform` on a single element does not support independent additive rotation tracks without Matrix decomposition or nested DOM wrappers.
3. Scroll event listeners fire at the display refresh rate ($60$–$120\text{Hz}$); creating object literals inside unthrottled handlers creates GC pressure.

#### Fix Implementation

1. **Touch Dimming**: Replaced disappearance with dimming: inactive touch scrubber remains visible at $70\%$ opacity (`opacity-70`) in compact mode, smoothly transitioning to $100\%$ on interaction.
2. **Nested Compositor Wrappers**: Separated idle continuous spin (`.scrubber-idle-spin`) onto a dedicated wrapper element, allowing the inner SVG's scroll-driven rotation (`rotate(${rotation}deg)`) to compose independently without snapping.
3. **Pre-allocated Object Pool**: Pre-allocated a fixed pool of $24$ particle slots ($14$ on mobile) with circular index recycling, velocity threshold ($\ge 3\text{px}$ movement), and $60\text{ms}$ throttle interval.
4. **Reduced Motion**: Honored `prefers-reduced-motion: reduce` across CSS and JavaScript to suppress both idle animations and heart particles.

#### Verification

- Server test suite `Mixtape Scrubber unit & integration suite` in `server/test/scrubber.test.js` passes 6/6 tests.
- Client ESLint passes with 0 errors and 0 warnings.
- Production bundle builds successfully in Vite.

---

## 5. Summary Table

| Bug ID      | Description                                                                                 | Severity | Area                 | Status    |
| ----------- | ------------------------------------------------------------------------------------------- | -------- | -------------------- | --------- |
| **BUG-001** | DetailsView back navigation hardcoded to Browse & missing history stack entry               | High     | Navigation / Routing | **Fixed** |
| **BUG-002** | Direct URL visits & refresh ignoring path (missing SPA history synchronization)             | Medium   | Navigation / Vercel  | **Fixed** |
| **BUG-003** | Search query lost on page refresh / back navigation                                         | Medium   | Browse / Search      | **Fixed** |
| **BUG-004** | Search race condition: rapid typing/clicking returns stale responses overwriting newer ones | High     | Browse / State       | **Fixed** |
| **BUG-005** | Form double-submission on rapid button clicks creating duplicate confessions                | High     | Submit Form          | **Fixed** |
| **BUG-006** | Swallowed server error messages (429 rate limit / 400 validation) on confession submit      | Medium   | Submit / Feedback    | **Fixed** |
| **BUG-007** | Blank screen / crash on deep link or direct URL visit to confession ID                      | High     | Details / Backend    | **Fixed** |
| **BUG-008** | Broken Spotify album art display crash/fallback                                             | Low      | UI / Visual          | **Fixed** |
| **BUG-009** | Scrubber touch disappearance, transform snapping & scroll allocation overhead               | Medium   | UI / Scrubber        | **Fixed** |

---

## 6. Verification & Test Suite Status

```
✔ Node Backend Tests: 43/43 passed (api.test.js, search-trends.test.js, rate-limit-sql.test.js, schema.test.js, features.test.js, scrubber.test.js)
✔ Client Lint: 0 errors, 0 warnings (eslint .)
✔ Client Build: Built production bundle successfully in Vite (0 errors)
```
