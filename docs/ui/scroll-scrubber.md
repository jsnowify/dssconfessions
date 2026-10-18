# Mixtape Scrubber & Hidden Native Scrollbars

## 1. Concept & Motivation

DSSConfessions uses a music/mixtape theme. Rather than relying on generic, browser-specific scrollbars positioned on the far edge of the screen, the interface employs a custom **Mixtape Scrubber**:
- Docked at the **bottom center** of the viewport as a floating pill.
- Combines a **rewind button** (to return to top), an inline SVG **wavy track** that fills with primary color as the user scrolls, a **mini vinyl playhead** that rotates with scroll velocity, and an `aria-hidden` **time readout** (`mm:ss`) representing pretend playback progress through a 3:30 mixtape.
- Native scrolling (mouse wheel, touch swipe, trackpad, keyboard) continues to function normally.
- Native scrollbars are hidden across the entire site without disabling scrolling.

---

## 2. Component API & Architecture

Located at [`client/src/components/ui/MixtapeScrubber.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/MixtapeScrubber.jsx):

```jsx
<MixtapeScrubber isMenuOpen={isMenuOpen} />
```

### Props
- `isMenuOpen` (`boolean`): When `true` (e.g. mobile navigation overlay is open), the scrubber hides itself completely to prevent touch and visual collisions.

### Key Features
1. **Rewind / Back-to-Top Button**:
   - 44px minimum tap target.
   - `aria-label="Back to top"`.
   - Scrolls the window to top (`window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "instant" : "smooth" })`).
2. **Interactive Track**:
   - Hand-drawn wavy SVG path.
   - Dynamic fill color representing progress percentage ($0\%$ to $100\%$).
   - Click/tap anywhere on the track jumps the viewport immediately to that percentage of the page.
3. **Draggable Vinyl Playhead**:
   - Uses Pointer Events (`onPointerDown`, `setPointerCapture`, `onPointerMove`, `onPointerUp`).
   - Uses `requestAnimationFrame` throttling for butter-smooth $60\text{fps}$ position tracking.
   - Spins on scroll based on scroll delta (rotates forward when scrolling down, backward when scrolling up; no continuous spin when idle).
   - Tilts slightly while dragged.
4. **Pretend Mixtape Timestamp**:
   - Formatted as `mm:ss` based on total duration of 3:30 (210 seconds).
   - Marked with `aria-hidden="true"` so assistive technologies are not confused by synthetic playback time.
5. **Auto-Hiding & Touch Dimming Rules**:
   - **Non-scrollable pages**: If `maxScroll <= 20px`, the scrubber is hidden.
   - **Dialogs & Modals**: A `MutationObserver` detects open `<dialog>` elements or elements with `role="dialog"` and `aria-modal="true"`. While any modal is open, the scrubber hides itself.
   - **Mobile Menu**: Hides when `isMenuOpen` is true.
   - **Touch Dimming**: On touch devices (`pointer: coarse`), instead of disappearing after scrolling stops, the scrubber dims to $70\%$ opacity in its compact state. This keeps it discoverable and displays the idle animation. Tapping or scrolling instantly expands it to full opacity ($100\%$).
6. **Idle Animation (Alive State)**:
   - Triggers when inactive (no scroll, drag, hover, or focus) for $1.2\text{s}$ (`IDLE_DELAY_MS = 1200`).
   - The mini vinyl spins slowly ($1$ revolution per $9\text{s}$, linear) on a nested wrapper so it never conflicts with scroll-driven rotation.
   - The scrubber pill gently floats with a subtle bob (`translateY` $0$ to $-3\text{px}$, $3.5\text{s}$ `ease-in-out`).
   - The playhead disc does a soft heartbeat pulse (`scale` $1 \to 1.1 \to 1$, $1.6\text{s}$ `ease-in-out`), and a small heart sticker on the pill pulses in sync.
   - Every $3$–$6\text{s}$ (randomized), a single heart floats up from the playhead while idle.
   - Interacting immediately ends idle mode.
   - Tab visibility: on `visibilitychange` (`document.hidden`), all idle timers and animations are paused.
7. **Heart Particle Trail**:
   - While moving (native scroll, drag, click-to-jump, keyboard), hearts emit behind the playhead along the track.
   - **Motion**: floats up $24$–$56\text{px}$, gentle horizontal sway ($\pm 12\text{px}$) biased opposite to scroll direction, rotates ($\pm 20^\circ$), lifetime $700$–$1100\text{ms}$.
   - **Colors**: cycles through neo-brutalist tokens (`--coral`, `--pink`, `--lilac`, `--primary`).
   - **Pooling & Hard Caps**: pre-allocated object pool capped at $24$ active particles on desktop and $14$ on mobile/touch (`pointer: coarse`). Zero DOM allocations inside scroll handlers.
   - **Velocity Guard**: requires minimum movement ($\ge 3\text{px}$) and rate-limits to at most $1$ heart per $60\text{ms}$. Zero particles emitted when stationary or jittering.
   - **Celebration Bursts**: burst of $8$ hearts when reaching the bottom of the page ($100\%$) and upon clicking the rewind / back-to-top button.
   - **Accessibility & Layout**: all particles have `aria-hidden="true"`, `pointer-events: none`, and are bounded inside viewport coordinates. Instant suppression under `prefers-reduced-motion: reduce`.

---

## 3. Accessibility & Keyboard Contract

The scrubber vinyl playhead adheres to the WAI-ARIA Slider pattern:
- **`role="slider"`**
- **`aria-label="Page position"`**
- **`aria-valuemin="0"`**
- **`aria-valuemax="100"`**
- **`aria-valuenow={Math.round(progress)}`**
- **`aria-valuetext={`${Math.round(progress)} percent of the page`}`**
- **`tabIndex={0}`** with a visible 2px ink focus ring.

### Keyboard Map
| Key | Action |
|---|---|
| `ArrowDown` / `ArrowRight` | Scroll down by $2\%$ of page height |
| `ArrowUp` / `ArrowLeft` | Scroll up by $2\%$ of page height |
| `PageDown` | Scroll down by one viewport height |
| `PageUp` | Scroll up by one viewport height |
| `Home` | Jump to top of page ($0\%$) |
| `End` | Jump to bottom of page ($100\%$) |

### Reduced Motion & Forced Colors
- When `prefers-reduced-motion: reduce` is detected:
  - Vinyl rotation and dragging tilt animations are disabled.
  - Page jump/rewind uses `behavior: "instant"`.
  - The playhead position updates instantaneously.
- When `forced-colors: active` (Windows High Contrast Mode):
  - System default scrollbars are restored.
  - The scrubber uses system color tokens (`ButtonText`, `ButtonFace`, etc.).

---

## 4. How Native Scrollbars Are Hidden

Native scrollbars are hidden cleanly without disabling scroll or locking the viewport:

```css
/* client/src/index.css */
html {
  scrollbar-gutter: stable;
  scrollbar-width: none; /* Firefox */
  background: var(--bg);
}
html::-webkit-scrollbar {
  display: none; /* Safari, Chrome, Edge */
}

/* Reusable utility class */
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
```

> [!WARNING]
> **Never use `overflow: hidden` on `html` or `body` to hide scrollbars.** That disables scrolling entirely and destroys mobile momentum scrolling. Always use `scrollbar-width: none` and `::-webkit-scrollbar { display: none }`.

---

## 5. Layout Safety & Router Interplay

- **Footer Spacing**: The footer in [`client/src/App.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/App.jsx) includes `pb-28` padding so content and buttons are never obscured by the floating scrubber.
- **Safe Area Insets**: The scrubber container uses `bottom: max(16px, env(safe-area-inset-bottom))`.
- **Z-Index Layering**:
  - Main content: default (`z-0`)
  - Floating Scrubber: `z-40`
  - Floating Toasts: `z-50`
  - Modals / Dialogs: native `<dialog>` top layer (`z-50+`)
- **Scroll Restoration (BUG-001)**: The scrubber listens to `window.addEventListener("scroll")`. When the user navigates Back to Home or Browse, the router restores the exact `window.scrollY`, and the scrubber immediately synchronizes its progress percentage and playhead position.

---

## 6. Verification Checklist

- [x] Native scrollbars invisible on desktop Chrome, Edge, Firefox, and Safari.
- [x] Mouse wheel, touch swipe, trackpad, and Arrow keys scroll smoothly.
- [x] Dragging vinyl playhead smoothly scrubs page position.
- [x] Tapping track jumps to position.
- [x] Rewind button scrolls smoothly to top (instant on reduced-motion).
- [x] Scrubber hides when page is not scrollable.
- [x] Scrubber hides when any modal is open.
- [x] Scrubber hides when mobile menu is open.
- [x] Back navigation restores exact scroll position and scrubber progress.

