# Design Archive

## 1. Overview & Philosophy

**dssconfessions** is where the creator practices creativity and design refinement.
The Design Archive exists in the footer because:

> *"I'm revamping my older projects to push myself past 'it works' and into 'it feels good': new layouts, new colors, new ideas. Each redesign teaches me something, so I keep the older versions here. This is the journey so far."*

The archive documents the visual evolution of the platform without cluttering the initial load performance or exposing sensitive student confessions.

---

## 2. Milestone Versions

| Version | Name | Period | Status | Key Characteristics |
|---|---|---|---|---|
| **v1** | **Black & White Brutalist** | February 2026 – August 2026 | Older (Shipped) | Stark high-contrast neo-brutalist aesthetic with pure monochrome surfaces, heavy ink borders, and infinite marquee ribbon. Featured distinct handwriting accent fonts (`Caveat` & `Reenie Beanie`). |
| **v2** | **Sunny Mixtape** | October 2026 – Present | **Current** | Light, warm, and playful neo-brutalist theme. Pastel wash background (`#F6F9FF`), soft navy ink (`#1F2A44`), electric blue primary accents (`#2563EB`), modular pinboard cards, Mixtape Scrubber, unlimited Poke button, and new Vinyl Speech Bubble logo system. |

*(Note: Intermediate scratch experiments such as the local Record Shop restyle are intentionally excluded from the public archive to focus exclusively on milestone platform releases).*

---

## 3. Privacy Guarantee & Data Interception

Under no circumstances are real student confessions, real names, student emails, or external third-party CDN assets included in the archive screenshots:

1. **Automated Interception (`scripts/capture-design-archive.mjs`)**:
   - Intercepts all `/api/*` endpoints via Playwright network routing.
   - Replaces API responses with fixed neutral placeholder confessions (`SAMPLE`, `ANONYMOUS`, `Sample Song`).
   - Replaces trending searches with neutral tags (`sample`, `music`, `crush`).
2. **CDN & Embed Blocking**:
   - Replaces Spotify album art CDN URLs (`scdn.co`, `spotify.com/image`) with a local pastel SVG placeholder.
   - Replaces Spotify iframe embeds with an accessible SVG dummy player.
3. **Automated Privacy Verification**:
   - `server/test/design-archive-and-logo.test.js` asserts zero `@dssc.edu.ph` emails or student phone numbers appear in `design-archive.json` or capture artifacts.

---

## 4. Screenshot Asset Specifications & Budgets

All screenshots are stored in `client/public/design-archive/` as optimized WebP images adhering to strict byte budgets:

| Device Viewport | Dimensions | File Suffix | Max Budget | Typical Size |
|---|---|---|---|---|
| **Desktop Full** | $1440 \times 900$ | `-desktop.webp` | $\le 180\text{ KB}$ | $19\text{ KB}$ – $49\text{ KB}$ |
| **Mobile Full** | $390 \times 844$ | `-mobile.webp` | $\le 120\text{ KB}$ | $14\text{ KB}$ – $29\text{ KB}$ |
| **Desktop Thumb** | $360 \times 225$ | `-desktop-thumb.webp` | $\le 60\text{ KB}$ | $7\text{ KB}$ – $15\text{ KB}$ |
| **Mobile Thumb** | $195 \times 422$ | `-mobile-thumb.webp` | $\le 60\text{ KB}$ | $6\text{ KB}$ – $13\text{ KB}$ |

Across all 4 pages (`home`, `browse`, `confess`, `about`), both devices, and both versions, exactly 16 files exist per version (32 files total).

---

## 5. UI Architecture & Performance

### 5.1 Disclosure Panel (`DesignArchive.jsx`)
- Located inside the footer of [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx).
- **Zero initial image load weight**: Thumbnails and screenshot images are conditionally mounted (`{isOpen && ...}`). On page load, exactly 0 bytes of archive images are requested.
- Accessible disclosure button with `aria-expanded` and `aria-controls="design-archive-panel"`.
- When opened, smoothly scrolls the panel into view (honoring `prefers-reduced-motion` with instant scroll).

### 5.2 Accessible Lightbox (`DesignArchiveLightbox.jsx`)
- WAI-ARIA `role="dialog"`, `aria-modal="true"`.
- **Background Scroll Locking**: Saves `window.scrollY` and locks `body.style.position = "fixed"`, preventing layout shifts and restoring exact scroll coordinates upon dismissal.
- **Focus Trap & Return**: Traps focus inside the dialog and restores focus to the invoking card on exit.
- **Keyboard Shortcuts**:
  - `Escape`: Closes the lightbox.
  - `ArrowLeft` / `ArrowRight`: Navigates through pages (`home` $\leftrightarrow$ `browse` $\leftrightarrow$ `confess` $\leftrightarrow$ `about`) and versions.
- **Preloading**: Preloads adjacent images in the background when a version is viewed to eliminate tab switching latency.

