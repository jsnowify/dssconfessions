import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "client", "public");

/**
 * Builds a multi-resolution .ico file from an array of PNG buffers.
 */
function createIcoFromPngs(pngBuffers) {
  const count = pngBuffers.length;
  // Header: 6 bytes
  // Directory entries: 16 bytes per image
  let offset = 6 + count * 16;
  const entries = [];

  for (const item of pngBuffers) {
    const { width, height, buffer } = item;
    const size = buffer.length;

    const entry = Buffer.alloc(16);
    entry.writeUInt8(width === 256 ? 0 : width, 0);
    entry.writeUInt8(height === 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(size, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset

    entries.push(entry);
    offset += size;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(count, 4); // image count

  return Buffer.concat([
    header,
    ...entries,
    ...pngBuffers.map((item) => item.buffer),
  ]);
}

async function main() {
  console.log("🎨 Building DSSConfessions Brand Assets...");

  const markSvgPath = path.join(publicDir, "logo-mark.svg");
  const faviconSvgPath = path.join(publicDir, "favicon.svg");

  const markSvgBuffer = await fs.readFile(markSvgPath);
  const faviconSvgBuffer = await fs.readFile(faviconSvgPath);

  // 1. Generate favicon-32.png
  console.log("Generating favicon-32.png...");
  await sharp(faviconSvgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, "favicon-32.png"));

  // 2. Generate multi-resolution favicon.ico (16, 32, 48)
  console.log("Generating favicon.ico (16x16, 32x32, 48x48)...");
  const icoSizes = [16, 32, 48];
  const icoBuffers = [];
  for (const size of icoSizes) {
    const buf = await sharp(faviconSvgBuffer).resize(size, size).png().toBuffer();
    icoBuffers.push({ width: size, height: size, buffer: buf });
  }
  const icoData = createIcoFromPngs(icoBuffers);
  await fs.writeFile(path.join(publicDir, "favicon.ico"), icoData);

  // 3. Generate apple-touch-icon.png (180x180 with 14% padding on paper background)
  console.log("Generating apple-touch-icon.png (180x180)...");
  const appleInnerSize = Math.round(180 * (1 - 0.14 * 2)); // ~130px
  const appleMarkBuffer = await sharp(markSvgBuffer)
    .resize(appleInnerSize, appleInnerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: "#F6F9FF",
    },
  })
    .composite([
      {
        input: appleMarkBuffer,
        top: Math.round((180 - appleInnerSize) / 2),
        left: Math.round((180 - appleInnerSize) / 2),
      },
    ])
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  // 4. Generate standard PWA icons: icon-192.png and icon-512.png
  console.log("Generating icon-192.png and icon-512.png...");
  await sharp(markSvgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  await sharp(markSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  // 5. Generate maskable PWA icons (20% safe zone padding on brand background)
  console.log("Generating icon-maskable-192.png and icon-maskable-512.png...");
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.64); // 18-20% margin on each side
    const resizedMark = await sharp(markSvgBuffer)
      .resize(inner, inner)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: "#F6F9FF",
      },
    })
      .composite([
        {
          input: resizedMark,
          top: Math.round((size - inner) / 2),
          left: Math.round((size - inner) / 2),
        },
      ])
      .png()
      .toFile(path.join(publicDir, `icon-maskable-${size}.png`));
  }

  // 6. Generate og-default.png (1200x630) using Playwright for exact font fidelity
  console.log("Generating og-default.png (1200x630) with Playwright...");
  const markSvgBase64 = markSvgBuffer.toString("base64");
  const ogHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: #F6F9FF;
      color: #1F2A44;
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 80px;
      position: relative;
    }
    /* Subtle decorative background wash pattern */
    .bg-circle-1 {
      position: absolute;
      top: -100px;
      right: -100px;
      width: 480px;
      height: 480px;
      border-radius: 50%;
      background: #EAF1FF;
      z-index: 1;
    }
    .bg-circle-2 {
      position: absolute;
      bottom: -120px;
      left: 360px;
      width: 380px;
      height: 380px;
      border-radius: 50%;
      background: #FFE1D3;
      opacity: 0.35;
      z-index: 1;
    }
    .content {
      position: relative;
      z-index: 2;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #FFF2B8;
      border: 2px solid #1F2A44;
      border-radius: 999px;
      padding: 8px 18px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 3px 3px 0 #1F2A44;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .lockup {
      display: flex;
      align-items: center;
      gap: 36px;
      margin: auto 0;
    }
    .logo-img {
      width: 144px;
      height: 144px;
      flex-shrink: 0;
    }
    .titles {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .wordmark {
      font-family: 'Caveat', cursive;
      font-size: 88px;
      font-weight: 700;
      line-height: 1;
      color: #1F2A44;
      letter-spacing: -0.01em;
    }
    .tagline {
      font-size: 26px;
      font-weight: 600;
      color: #3F6AE8;
      line-height: 1.3;
    }
    .subtitle {
      font-size: 19px;
      font-weight: 400;
      color: #56627F;
    }
    .bottom-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 2px solid #1F2A44;
      padding-top: 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 600;
      color: #56627F;
    }
    .pills-row {
      display: flex;
      gap: 12px;
    }
    .tag-pill {
      background: #FFFFFF;
      border: 2px solid #1F2A44;
      border-radius: 999px;
      padding: 6px 16px;
      font-size: 13px;
      color: #1F2A44;
      box-shadow: 2px 2px 0 #1F2A44;
    }
  </style>
</head>
<body>
  <div class="bg-circle-1"></div>
  <div class="bg-circle-2"></div>
  <div class="content">
    <div class="top-bar">
      <div class="badge">🎵 Davao del Sur State College</div>
      <div class="pills-row">
        <span class="tag-pill">100% Anonymous</span>
        <span class="tag-pill">Zero Accounts</span>
        <span class="tag-pill">Song Stories</span>
      </div>
    </div>
    <div class="lockup">
      <img class="logo-img" src="data:image/svg+xml;base64,${markSvgBase64}" alt="DSSConfessions Logo Mark" />
      <div class="titles">
        <h1 class="wordmark">dssconfessions</h1>
        <p class="tagline">Untold words, sent through the song.</p>
        <p class="subtitle">A quiet, friendly space to share your story with the soundtrack that belongs to it.</p>
      </div>
    </div>
    <div class="bottom-bar">
      <span>dssconfessions.vercel.app</span>
      <span>DSSC Student Community</span>
    </div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  await page.setContent(ogHtml, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const ogBuffer = await page.screenshot({ type: "png" });
  await browser.close();

  await sharp(ogBuffer)
    .png({ quality: 90 })
    .toFile(path.join(publicDir, "og-default.png"));

  console.log("✅ Brand assets built successfully!");
}

main().catch((err) => {
  console.error("❌ Failed to build brand assets:", err);
  process.exit(1);
});
