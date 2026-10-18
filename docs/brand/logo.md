# Logo System & Brand Identity

## 1. Concept & Metaphor

The **DSSConfessions** brand mark embodies the platform's core identity:
> *"Untold words, sent through the song"*

### The Symbol: Vinyl Speech Bubble
- **Speech Bubble Silhouette**: Represents confessions, unspoken words, and student expression.
- **Grooved Vinyl Record**: Concentric dashed ring grooves evoke music playback, mixtapes, and analog crates.
- **Heart-Shaped Spindle Hole**: Represents vulnerable romantic emotions, anonymous crushes, and care.
- **Accent Tape**: A playful neo-brutalist strip of pastel butter tape angled at the top right, tying the mark to physical collage and pinboards.

---

## 2. Asset Inventory

All brand assets are generated into `client/public/` via `scripts/build-brand-assets.mjs` (`npm run brand:build`):

| File | Format | Dimensions | Purpose & Rules |
|---|---|---|---|
| `logo-mark.svg` | SVG | $128 \times 128$ (scalable) | Full-color primary mark. Uses `.grooves` class for interactive spinning and heart pulsing. Flat fills only, no scripts or remote links. |
| `logo-mark-mono.svg` | SVG | $128 \times 128$ (scalable) | Single-color monochrome mark using `currentColor`. Utilizes pure vector `fill-rule="evenodd"` compound path cutout. **No SVG `<mask`> elements**. |
| `favicon.svg` | SVG | $32 \times 32$ | Simplified vector favicon for modern browser tabs. Under $1\text{ KB}$. |
| `favicon-32.png` | PNG | $32 \times 32$ | Crisp raster fallback for legacy browser tabs. |
| `favicon.ico` | ICO | 16, 32, 48 multi-res | Classic Windows & browser bookmark icon. |
| `apple-touch-icon.png` | PNG | $180 \times 180$ | iOS home screen bookmark icon with 14% safe padding on `#F6F9FF`. |
| `icon-192.png` | PNG | $192 \times 192$ | Android & PWA splash/launcher icon. |
| `icon-512.png` | PNG | $512 \times 512$ | High-res PWA icon for app stores & manifest. |
| `icon-maskable-192.png` | PNG | $192 \times 192$ | Adaptive Android launcher icon with 20% safe zone padding. |
| `icon-maskable-512.png` | PNG | $512 \times 512$ | High-res adaptive Android launcher icon. |
| `og-default.png` | PNG | $1200 \times 630$ | Social sharing card rendered with live `Caveat` script font and tagline. |

---

## 3. `<Logo />` React Component Architecture

The `<Logo />` component is located at [`client/src/components/ui/Logo.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/Logo.jsx):

```jsx
import Logo from "./components/ui/Logo";

// Header navigation:
<Logo variant="header" />

// Footer brand lockup:
<Logo variant="footer" />

// Stacked hero / about display:
<Logo variant="stacked" />

// Icon only:
<Logo variant="mark-only" size={32} />
```

### Variants
1. `header`: Compact horizontal lockup ($36\text{px}$ mark, single-line wordmark `dssconfessions` in `Caveat` script font with electric blue dot).
2. `footer`: Extended horizontal lockup ($40\text{px}$ mark, wordmark + community tagline `"Untold words, sent through the song"` in `Reenie Beanie`).
3. `stacked`: Centered vertical lockup for hero banners or modals.
4. `mark-only`: Standalone mark with configurable `size` and `className`.

### Micro-Interactions
- On hover/focus-visible of the parent interactive element:
  - `.grooves`: Dashed concentric vinyl rings rotate smoothly ($6\text{s}$ linear infinite).
  - `#vinyl-spindle-heart`: Pulses subtly ($1.2\text{s}$ ease-in-out infinite).
- **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, animations are completely disabled.

---

## 4. Monochrome Vector Engineering

Unlike conventional SVG designs that rely on CSS masks or SVG `<mask`> tags (which frequently fail to render in dark-mode inverters, email clients, or rasterizers), `logo-mark-mono.svg` uses a native **compound path**:
- The outer contour draws clockwise.
- The inner spindle heart cutout draws counter-clockwise.
- Rendered with `fill-rule="evenodd"` and `fill="currentColor"`.
- This ensures true vector transparency through the center of the disc in any background context.

---

## 5. Brand Do's & Don'ts

### Do:
- Always use live text in `Caveat` for the wordmark text (preserving font accessibility and crisp rendering).
- Respect minimum sizes: $24\text{px}$ for mark-only, $32\text{px}$ for lockups.
- Ensure the dot on `dssconfessions` matches `--primary` (`#2563EB`).

### Don't:
- Never embed fonts or convert text to static raster images in the header or footer.
- Never add drop shadows to the SVG vector mark itself (drop shadows belong on outer neo-brutalist container boxes).
- Never stretch, skew, or distort the mark aspect ratio.

