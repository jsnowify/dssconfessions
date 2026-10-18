# Sunny Mixtape redesign

Implemented locally on 2026-10-18. Not committed, pushed, or deployed. Existing uncommitted backend/features work was preserved.

## Layout and visual changes

Floating white pill navigation with blue active pills; a keyboard accessible mobile dropdown at <=640px; a wash footer with three inline SVG doodles. Home now has an asymmetric real-card hero, a compact connected stepper, a CSS-column pinboard, and a lilac closing invitation. Browse uses a joined pill search, numbered pastel Top Charts stickers, result counts, and the same pinboard. Confess has three visual form sections and a sticky real-card preview. About uses sky/lilac/mint bento tiles with its exact previous text. Detail uses the same card enlarged, plus the existing Spotify embed, Save for IG, sharing, replies, reporting, and author controls. Dialogs use a white surface and pastel header; their existing native-dialog focus trap/Esc/return-focus code is preserved.

Removed the walnut/crate backgrounds, paper noise, sleeve ring wear, heavy dark grooves, tomato/mustard brand colors, oversized hero record, animated duplicated marquee rows, and gradient masks. The old feed-layout helper remains unused rather than changing its behavior. Existing feed data is rendered once in the pinboard; no pagination was invented because the current endpoint has a fixed limit and no page/offset contract. Existing example-name chips were removed so empty/failed trends show the normal empty state. No files or features were deleted.

## Files changed for this request

- client/src/index.css - complete light token/layout/component stylesheet, responsive rules and reduced motion.
- client/src/App.jsx - footer doodles only; routing handlers unchanged.
- client/src/components/layout/Navbar.jsx - floating navigation and mobile keyboard/focus handling.
- client/src/components/ui/ConfessionCard.jsx - pastel tile, TO note, song strip, tiny disc, full-size presentation.
- client/src/components/ui/StepCard.jsx - compact stepper item.
- client/src/components/ui/Modal.jsx - pastel header class only.
- client/src/views/HomeView.jsx - real-feed cluster, stepper, unduplicated pinboard, empty state, CTA.
- client/src/views/BrowseView.jsx - joined search, chips and results presentation; handlers/effects unchanged.
- client/src/views/SubmitView.jsx - three-panel form, visible tags, SVG/CSS fallback, original submission/validation unchanged.
- client/src/views/AboutView.jsx - bento presentation and shield; original copy retained exactly.
- client/src/views/DetailsView.jsx - large shared card and existing player/actions.
- client/src/utils/shareCard.js - current pastel colors and navy solid shadow for client-generated PNGs; dimensions, fonts, wrapping, privacy and downloads unchanged.
- client/public/og-record-shop.png - recolored the existing generic OG asset in place; filename and server metadata contract unchanged. No new app image asset.
- docs/BUGS.md - records the existing scroll-restoration limitation.
- docs/record-shop-restyle.md - marked the previous visual report as superseded.

Created:

- client/src/components/ui/Doodle.jsx - small decorative inline SVG shapes.
- client/src/utils/pastel.js - presentation-only stable id hash.
- docs/sunny-mixtape-redesign.md - this report.

## Final root variables

```css
:root {
  --bg: #f6f9ff;
  --bg-wash: #eaf1ff;
  --surface: #ffffff;
  --ink: #1f2a44;
  --ink-soft: #56627f;
  --primary: #3f6ae8;
  --primary-ink: #ffffff;
  --coral: #ff6b6b;
  --sky: #cfe3ff;
  --mint: #cdefe0;
  --lilac: #e2d8ff;
  --peach: #ffe1d3;
  --butter: #fff2b8;
  --pink: #ffd9e8;
  --radius: 20px;
  --radius-sm: 12px;
  --radius-pill: 999px;
  --border: 2px solid var(--ink);
  --shadow: 3px 3px 0 var(--ink);
  --shadow-hover: 5px 5px 0 var(--ink);
  --shadow-press: 0 0 0 var(--ink);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  /* Compatibility aliases for existing feature markup and export colors. */
  --paper: var(--surface);
  --sleeve: var(--surface);
  --sleeve-shade: var(--bg-wash);
  --text: var(--ink);
  --text-soft: var(--ink-soft);
  --accent: var(--primary);
  --accent-ink: var(--primary);
  --highlight: var(--butter);
  --mustard: var(--butter);
}
```

The original @theme font declarations and Google Fonts import are unchanged: Caveat for script, Reenie Beanie for handwritten text, Inter for UI, and the existing metadata font utilities. Message text remains 24px mobile / 30px desktop; full detail messages remain 30px / 36px. Small metadata uses navy locally on pastels: the requested ink-soft is only 4.49:1 on lilac. About links use white backing so the required primary blue passes text contrast. Focus uses the requested blue 3px outline with 3px offset and white separation where applicable.

## Real data and stable colors

cardPastel(id) computes an unsigned rolling hash (hash * 31 + Unicode code point), then selects hash modulo six in sky, mint, lilac, peach, butter, pink order. An id-less live preview uses sky. Share PNGs use the same helper. The hero reads feed.slice(0, 3) from the existing feed prop: fewer items means fewer cards; no items means a decorative pastel record, with no invented recipient, message, song, or date. The fresh pinboard maps the original feed array directly.

## Verification

- [x] Client lint and production build pass. No dependencies added. Current build is approximately 293.7 kB JS / 94.8 kB gzip.
- [x] All 30 existing Node/Postgres/API tests pass.
- [x] Desktop 1280px, smaller desktop 1024px, tablet 768px, and mobile 360px, each with reduced motion on and off: 80 axe WCAG A/AA view/state scans with zero violations; no document overflow.
- [x] Additional desktop/mobile keyboard and revised-layout pass: 40 scans with zero violations. Mobile menu opens via Enter, moves focus into links, closes via Escape, and returns focus to its button.
- [x] Short message (mwa), long message, 450-character unbroken words, long names/titles, five-line clamps, Read more / Show less, and broken album art checked in browser fixtures. Existing handwriting sizes asserted.
- [x] Keyboard Spotify result selection, valid/disabled posting, character counter, reply opt-out preview, and changing selected songs checked.
- [x] Desktop/mobile post double-click creates one request; key receipt copy/download and unsaved-key Escape behavior, no key in URL/history/storage, both share sizes (1080x1350 and 1080x1920), anonymous-sender omission, song replies, reporting, author unlock/removal, and hard-delete replacement navigation pass. Twelve feature-dialog/state axe scans have zero violations.
- [x] Generic OG wrapper/meta-refresh loads the SPA deep link, retains noindex and adds one history entry; Back returns to the previous page.
- [x] Empty feed, loading skeletons, feed errors/retry, and silent empty/failed trends checked at desktop/mobile: twelve additional axe scans with zero violations; no invented hero content.
- [x] Lighthouse desktop accessibility: previous build 100 / 100 / 100 / 100; Sunny 100 / 100 / 100 / 100 on Home, Browse, Confess, About. Scores use empty API fixtures, not production data.
- [x] Source comparison: all server, API, SQL, Vercel configuration and hook files byte-identical to the start of this redesign. Router/search/submission handlers AST-identical; exact font declarations and About text retained. React review found no new data-fetch waterfalls or dependencies; the new menu effect cleans up its listener.
- [x] Visual screenshots reviewed for desktop and 360px mobile. Motion is transform/opacity only; reduced motion disables animations/transitions and animated will-change. No feed animation or masks remain.
- [ ] Exact Home scroll restoration is a pre-existing failure, reproduced in both builds: start at 600, open detail, Back restores 0. Returning to Home and URL/history navigation work. The router stores scrollY on the detail entry rather than the previous Home entry; changing it would violate this request's prohibition on history changes.

## Limits and unchanged behavior

The existing Spotify iframe provides no playback-state callback to the app. Card play buttons still open/focus that existing player, and reply selection still changes its track. This visual pass does not invent a playing state, aria-pressed toggle, auto-play behavior, or spinning record that claims audio is playing. The CSS supports a playing-only disc class, but no decorative record spins without a real state signal. The embedded Spotify UI is provider-controlled and cannot be restyled from this app.

The older Save for IG action retains its original renderer and fonts; the newer Share dialog uses the recolored shared PNG renderer. No image is uploaded. Actual Spotify audio, native mobile share sheets, and production deployment were not exercised; browser checks use local deterministic fixtures and mocked embeds and never write production confessions.

The previously documented Browse chip/callback cancellation issue remains unchanged: a chip updates input/URL and calls the same handler, but its callback/effect interaction may abort the request. This is recorded in BUGS.md. BUG-001 through BUG-008 implementation was preserved; source comparison and regression checks found no redesign-introduced regression, but the two pre-existing navigation/search limitations above prevent an honest claim that every historical Fixed entry currently passes all scenarios.

No fonts, routes, API shapes, database behavior, search/trending logic, rate limiting or router handlers were changed. No migrations or deployment settings are needed for this redesign itself; the earlier feature migration/environment requirements in features.md still apply before those features go live.
