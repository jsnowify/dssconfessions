# Technical SEO, Metadata & PWA Specification

## 1. Metadata Architecture

[`client/index.html`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/index.html) serves as the primary SEO entry point, configured with modern HTML5, PWA, and Open Graph metadata:

### 1.1 Primary Tags & Theme Colors
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#F6F9FF" />
```

### 1.2 Open Graph & Social Cards
- `og:image`: Direct link to `/og-default.png` ($1200 \times 630\text{px}$).
- `og:image:width`: `1200`
- `og:image:height`: `630`
- `og:image:type`: `image/png`
- `twitter:card`: `summary_large_image`

### 1.3 JSON-LD Structured Data
Structured semantic data declares `WebApplication` and `Organization` schemas:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://dssconfessions.vercel.app/#app",
      "name": "DSSC Confessions",
      "url": "https://dssconfessions.vercel.app/",
      "applicationCategory": "EntertainmentApplication",
      "operatingSystem": "All",
      "description": "Anonymous song-confession platform for the DSSC student community."
    },
    {
      "@type": "Organization",
      "@id": "https://dssconfessions.vercel.app/#org",
      "name": "DSSC Confessions",
      "url": "https://dssconfessions.vercel.app/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://dssconfessions.vercel.app/logo-mark.svg",
        "width": 128,
        "height": 128
      }
    }
  ]
}
```

---

## 2. PWA Web App Manifest (`site.webmanifest`)

Located in [`client/public/site.webmanifest`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/public/site.webmanifest):
- Declares standard non-maskable icons ($192\text{px}$, $512\text{px}$) for application stores.
- Declares adaptive maskable icons ($192\text{px}$, $512\text{px}$) with $20\%$ safe area padding for Android adaptive launchers.
- Color theme: `background_color: "#F6F9FF"` and `theme_color: "#F6F9FF"`.

---

## 3. Automated Verification (`npm run seo:check`)

The automated script [`scripts/seo-check.mjs`](file:///c:/Coding/JavaScript/Project/dss-confessions/scripts/seo-check.mjs) runs in CI and pre-deployment pipelines:

1. **Brand Asset Existence & Sizing**: Validates all PNG dimensions ($32\text{px}$, $180\text{px}$, $192\text{px}$, $512\text{px}$, $1200 \times 630\text{px}$) and SVG file size limits.
2. **Manifest Integrity**: Validates JSON syntax, application name, short name, and presence of standard + maskable icons.
3. **HTML Head Completeness**: Verifies all `<link rel="...">` and `<meta>` elements in `client/index.html`.
4. **Design Archive Image Budgets**: Iterates through `client/src/content/design-archive.json` to verify that every thumbnail and full-resolution screenshot exists on disk and stays within byte budgets.

