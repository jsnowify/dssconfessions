import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const clientDist = path.join(rootDir, "client", "dist");
const archivePublicDir = path.join(rootDir, "client", "public", "design-archive");
const contentJsonPath = path.join(rootDir, "client", "src", "content", "design-archive.json");

// Size budgets (in bytes)
const BUDGETS = {
  THUMB: 60 * 1024, // 60 KB
  DESKTOP_FULL: 180 * 1024, // 180 KB
  MOBILE_FULL: 120 * 1024, // 120 KB
};

// Privacy-guaranteed neutral placeholder confessions (NO real user data)
const NEUTRAL_CONFESSIONS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    recipient_to: "SAMPLE",
    sender_from: "ANONYMOUS",
    content: "Your untold words go here. Sent through the music, kept safe forever.",
    song_name: "Sample Song",
    artist_name: "Sample Artist",
    album_art: null,
    spotify_url: "https://open.spotify.com/track/sample1",
    created_at: "2026-08-08T12:00:00Z",
    poke_count: 42,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    recipient_to: "SAMPLE RECIPIENT",
    sender_from: "ANONYMOUS",
    content: "I still remember the melody we listened to. Every time it comes on, I think of that quiet afternoon.",
    song_name: "Melody in Bloom",
    artist_name: "Sample Artist",
    album_art: null,
    spotify_url: "https://open.spotify.com/track/sample2",
    created_at: "2026-08-08T11:30:00Z",
    poke_count: 18,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    recipient_to: "SOMEONE SPECIAL",
    sender_from: "ANONYMOUS",
    content: "We never said the words out loud, but the chorus said everything we needed to say.",
    song_name: "Untold Words",
    artist_name: "Sample Artist",
    album_art: null,
    spotify_url: "https://open.spotify.com/track/sample3",
    created_at: "2026-08-08T10:15:00Z",
    poke_count: 27,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    recipient_to: "FRIEND",
    sender_from: "ANONYMOUS",
    content: "Thank you for walking with me across campus when the days were heavy. This song is for you.",
    song_name: "Campus Walk",
    artist_name: "Sample Artist",
    album_art: null,
    spotify_url: "https://open.spotify.com/track/sample4",
    created_at: "2026-08-08T09:00:00Z",
    poke_count: 9,
  },
];

const NEUTRAL_TRENDS = [
  { term: "sample", hits: 14 },
  { term: "music", hits: 8 },
  { term: "crush", hits: 5 },
];

/**
 * Creates a lightweight local static HTTP server for serving client/dist.
 */
async function startStaticServer() {
  const types = {
    ".js": "text/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let filePath = path.join(clientDist, url.pathname);

      try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) filePath = path.join(clientDist, "index.html");
      } catch {
        filePath = path.join(clientDist, "index.html");
      }

      const ext = path.extname(filePath);
      const data = await fs.readFile(filePath);
      res.setHeader("Content-Type", types[ext] || "application/octet-stream");
      res.writeHead(200);
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/**
 * Sets up network request interception on a Playwright page.
 * Guarantees that NO real user confessions or external album covers are loaded.
 */
async function setupPrivacyInterception(page) {
  // 1. Block external image CDNs completely (Spotify CDN, etc.)
  await page.route(/(scdn\.co|spotify\.com\/image|fbcdn|imgur)/i, (route) => {
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#EAF1FF"/></svg>',
    });
  });

  // 2. Intercept Spotify embeds
  await page.route(/open\.spotify\.com\/embed/i, (route) => {
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<html lang="en"><body style="margin:0;background:#EAF1FF;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#1F2A44;font-size:12px;">🎵 Sample Spotify Player</body></html>',
    });
  });

  // 3. Intercept all /api/* requests with neutral data
  await page.route(/\/api\/.*/, async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.includes("/top-searches")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(NEUTRAL_TRENDS),
      });
    }

    if (url.pathname.includes("/search-song")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "sample-track-1",
            name: "Sample Song",
            artists: [{ name: "Sample Artist" }],
            album: { images: [] },
          },
        ]),
      });
    }

    if (url.pathname.includes("/health")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok" }),
      });
    }

    // Confessions list / search
    if (url.searchParams.has("to")) {
      const term = url.searchParams.get("to").toLowerCase();
      const filtered = NEUTRAL_CONFESSIONS.filter((c) =>
        c.recipient_to.toLowerCase().includes(term),
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(filtered.length ? filtered : NEUTRAL_CONFESSIONS.slice(0, 2)),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(NEUTRAL_CONFESSIONS),
    });
  });
}

/**
 * Optimizes a PNG buffer into WebP with metadata stripped and validates against size budget.
 */
async function saveWebP({ buffer, targetPath, width, height, budgetBytes, label }) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  const webpBuffer = await sharp(buffer)
    .resize(width, height, { fit: "cover", position: "top" })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();

  await fs.writeFile(targetPath, webpBuffer);
  const size = webpBuffer.length;
  const isUnderBudget = size <= budgetBytes;

  console.log(
    `  ↳ ${label}: ${width}x${height} | ${(size / 1024).toFixed(1)} KB ${
      isUnderBudget ? "✅" : "⚠️ (over budget)"
    }`,
  );

  return { size, width, height, isUnderBudget };
}

async function main() {
  console.log("📸 Starting DSSConfessions Design Archive Capture...");

  const server = await startStaticServer();
  console.log(`Local static server running at ${server.origin}`);

  const browser = await chromium.launch({ channel: "msedge", headless: true });

  const versions = [
    {
      id: "v1",
      name: "Black & White Brutalist",
      period: "February 2026 – August 2026",
      current: false,
      summary:
        "Stark high-contrast neo-brutalist aesthetic with pure monochrome surfaces, heavy ink borders, and an infinite marquee ribbon.",
      learned: [
        "What worked: Bold visual punch, distinctive handwriting accent font pairing (Caveat and Reenie Beanie), and raw student-built character.",
        "What needed improvement: Gray metadata had low contrast (~2.5:1), handwriting text truncated on cards made confessions hard to read, and the lack of warm color felt stark.",
      ],
      // Live deployment on Vercel serves the authentic v1 Black & White Brutalist design
      baseUrl: "https://dssconfessions.vercel.app",
      injectCss: null,
    },
    {
      id: "v2",
      name: "Sunny Mixtape",
      period: "October 2026 – Present",
      current: true,
      summary:
        "Light, warm, and playful neo-brutalist theme featuring a gentle pastel wash background, soft navy ink, electric blue primary accents, modular pinboard cards, and a floating Mixtape Scrubber.",
      learned: [
        "What worked: Welcoming community feel that feels optimistic rather than gloomy, strict WCAG AA contrast on every pastel card, and interactive touches like the Mixtape Scrubber and unlimited Poke button.",
        "What we're keeping: Live-text handwriting wordmark, tactile 2px ink borders, solid offset drop shadows, and zero-tracking privacy promise.",
      ],
      baseUrl: server.origin,
      injectCss: null,
    },
  ];

  const pages = [
    { name: "home", path: "/", alt: "Home page with hero header and confession feed" },
    { name: "browse", path: "/browse", alt: "Browse page with recipient search and song cards" },
    { name: "confess", path: "/confess", alt: "Confess submission form with song search" },
    { name: "about", path: "/about", alt: "About page with platform values and student credits" },
  ];

  const archiveData = {
    intro:
      "dssconfessions is also where I practice being more creative. I'm revamping my older projects to push myself past 'it works' and into 'it feels good': new layouts, new colors, new ideas. Each redesign teaches me something, so I keep the older versions here. This is the journey so far.",
    disclaimer: "Screenshots use placeholder text. Real confessions are never shown here.",
    versions: [],
  };

  for (const version of versions) {
    console.log(`\n📷 Capturing Version: ${version.id} (${version.name})...`);
    const versionImages = [];

    for (const pageItem of pages) {
      console.log(`  Capturing page: ${pageItem.name}...`);

      // 1. Desktop Capture (1440x900)
      const desktopCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      });
      const desktopPage = await desktopCtx.newPage();
      await setupPrivacyInterception(desktopPage);

      const targetUrl = `${version.baseUrl}${pageItem.path}`;
      try {
        await desktopPage.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
      } catch (err) {
        console.warn(`  Warning on goto ${targetUrl}: ${err.message}`);
      }

      await desktopPage.evaluate(() => document.fonts?.ready);
      if (version.injectCss) {
        await desktopPage.addStyleTag({ content: version.injectCss });
      }
      await desktopPage.waitForTimeout(600); // Allow animations to settle

      const desktopPngBuffer = await desktopPage.screenshot({ fullPage: false });
      await desktopCtx.close();

      // Optimize Desktop Full & Thumb
      const desktopFullRel = `/design-archive/${version.id}/${pageItem.name}-desktop.webp`;
      const desktopThumbRel = `/design-archive/${version.id}/${pageItem.name}-desktop-thumb.webp`;

      await saveWebP({
        buffer: desktopPngBuffer,
        targetPath: path.join(archivePublicDir, version.id, `${pageItem.name}-desktop.webp`),
        width: 1440,
        height: 900,
        budgetBytes: BUDGETS.DESKTOP_FULL,
        label: `${pageItem.name}-desktop`,
      });

      await saveWebP({
        buffer: desktopPngBuffer,
        targetPath: path.join(archivePublicDir, version.id, `${pageItem.name}-desktop-thumb.webp`),
        width: 640,
        height: 400,
        budgetBytes: BUDGETS.THUMB,
        label: `${pageItem.name}-desktop-thumb`,
      });

      versionImages.push({
        page: pageItem.name,
        device: "desktop",
        thumb: desktopThumbRel,
        full: desktopFullRel,
        width: 1440,
        height: 900,
        alt: `${version.name} - ${pageItem.alt} (Desktop)`,
      });

      // 2. Mobile Capture (390x844)
      const mobileCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
      });
      const mobilePage = await mobileCtx.newPage();
      await setupPrivacyInterception(mobilePage);

      try {
        await mobilePage.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
      } catch (err) {
        console.warn(`  Warning on mobile goto ${targetUrl}: ${err.message}`);
      }

      await mobilePage.evaluate(() => document.fonts?.ready);
      if (version.injectCss) {
        await mobilePage.addStyleTag({ content: version.injectCss });
      }
      await mobilePage.waitForTimeout(600);

      const mobilePngBuffer = await mobilePage.screenshot({ fullPage: false });
      await mobileCtx.close();

      // Optimize Mobile Full & Thumb
      const mobileFullRel = `/design-archive/${version.id}/${pageItem.name}-mobile.webp`;
      const mobileThumbRel = `/design-archive/${version.id}/${pageItem.name}-mobile-thumb.webp`;

      await saveWebP({
        buffer: mobilePngBuffer,
        targetPath: path.join(archivePublicDir, version.id, `${pageItem.name}-mobile.webp`),
        width: 390,
        height: 844,
        budgetBytes: BUDGETS.MOBILE_FULL,
        label: `${pageItem.name}-mobile`,
      });

      await saveWebP({
        buffer: mobilePngBuffer,
        targetPath: path.join(archivePublicDir, version.id, `${pageItem.name}-mobile-thumb.webp`),
        width: 390,
        height: 844,
        budgetBytes: BUDGETS.THUMB,
        label: `${pageItem.name}-mobile-thumb`,
      });

      versionImages.push({
        page: pageItem.name,
        device: "mobile",
        thumb: mobileThumbRel,
        full: mobileFullRel,
        width: 390,
        height: 844,
        alt: `${version.name} - ${pageItem.alt} (Mobile)`,
      });
    }

    archiveData.versions.push({
      id: version.id,
      name: version.name,
      period: version.period,
      current: version.current,
      summary: version.summary,
      learned: version.learned,
      images: versionImages,
    });
  }

  await browser.close();
  await server.close();

  // Write design-archive.json (single source of truth)
  await fs.mkdir(path.dirname(contentJsonPath), { recursive: true });
  await fs.writeFile(contentJsonPath, JSON.stringify(archiveData, null, 2), "utf8");
  console.log(`\n✅ Saved design-archive.json with ${archiveData.versions.length} versions!`);
}

main().catch((err) => {
  console.error("❌ Archive capture failed:", err);
  process.exit(1);
});
