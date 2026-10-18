import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "client", "public");
const indexHtmlPath = path.join(rootDir, "client", "index.html");
const manifestPath = path.join(publicDir, "site.webmanifest");
const archiveJsonPath = path.join(rootDir, "client", "src", "content", "design-archive.json");

const REQUIRED_BRAND_ASSETS = [
  { file: "logo-mark.svg", type: "svg", maxSize: 3072 },
  { file: "logo-mark-mono.svg", type: "svg", maxSize: 2048 },
  { file: "favicon.svg", type: "svg", maxSize: 1536 },
  { file: "favicon.ico", type: "ico" },
  { file: "favicon-32.png", type: "png", width: 32, height: 32 },
  { file: "apple-touch-icon.png", type: "png", width: 180, height: 180 },
  { file: "icon-192.png", type: "png", width: 192, height: 192 },
  { file: "icon-512.png", type: "png", width: 512, height: 512 },
  { file: "icon-maskable-192.png", type: "png", width: 192, height: 192 },
  { file: "icon-maskable-512.png", type: "png", width: 512, height: 512 },
  { file: "og-default.png", type: "png", width: 1200, height: 630 },
];

const BUDGETS = {
  THUMB: 60 * 1024,
  DESKTOP_FULL: 180 * 1024,
  MOBILE_FULL: 120 * 1024,
};

async function main() {
  console.log("🔍 Running SEO, Brand Assets & Design Archive Verification (seo:check)...");
  let passed = true;

  // 1. Verify Brand Assets
  console.log("\n[1/4] Verifying Brand Assets...");
  for (const asset of REQUIRED_BRAND_ASSETS) {
    const filePath = path.join(publicDir, asset.file);
    try {
      const stat = await fs.stat(filePath);
      if (asset.maxSize && stat.size > asset.maxSize) {
        console.error(`  ❌ ${asset.file} exceeds size limit (${stat.size} > ${asset.maxSize} bytes)`);
        passed = false;
      } else if (asset.type === "png" && asset.width && asset.height) {
        const meta = await sharp(filePath).metadata();
        if (meta.width !== asset.width || meta.height !== asset.height) {
          console.error(
            `  ❌ ${asset.file} dimension mismatch: expected ${asset.width}x${asset.height}, got ${meta.width}x${meta.height}`,
          );
          passed = false;
        } else {
          console.log(`  ✓ ${asset.file} (${meta.width}x${meta.height}, ${(stat.size / 1024).toFixed(1)} KB)`);
        }
      } else {
        console.log(`  ✓ ${asset.file} (${stat.size} bytes)`);
      }
    } catch {
      console.error(`  ❌ Missing required asset: ${asset.file}`);
      passed = false;
    }
  }

  // 2. Verify site.webmanifest
  console.log("\n[2/4] Verifying site.webmanifest...");
  try {
    const manifestText = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestText);
    if (!manifest.name || !manifest.short_name || !manifest.icons?.length) {
      console.error("  ❌ Manifest missing essential fields (name, short_name, icons)");
      passed = false;
    } else {
      console.log(`  ✓ Manifest valid: "${manifest.name}" with ${manifest.icons.length} icon definitions.`);
    }
  } catch (err) {
    console.error(`  ❌ Failed reading site.webmanifest: ${err.message}`);
    passed = false;
  }

  // 3. Verify client/index.html Head Metadata
  console.log("\n[3/4] Verifying client/index.html Head Metadata...");
  try {
    const html = await fs.readFile(indexHtmlPath, "utf8");
    const requiredChecks = [
      { name: "favicon.svg link", test: html.includes('href="/favicon.svg"') },
      { name: "site.webmanifest link", test: html.includes('href="/site.webmanifest"') },
      { name: "theme-color meta", test: html.includes('content="#F6F9FF"') },
      { name: "og-default.png meta", test: html.includes('og-default.png') },
      { name: "og:image:width 1200", test: html.includes('content="1200"') },
      { name: "og:image:height 630", test: html.includes('content="630"') },
      { name: "JSON-LD logo schema", test: html.includes('logo-mark.svg') },
    ];

    for (const check of requiredChecks) {
      if (check.test) {
        console.log(`  ✓ ${check.name}`);
      } else {
        console.error(`  ❌ Missing in index.html: ${check.name}`);
        passed = false;
      }
    }
  } catch (err) {
    console.error(`  ❌ Failed reading index.html: ${err.message}`);
    passed = false;
  }

  // 4. Verify design-archive.json and Images
  console.log("\n[4/4] Verifying Design Archive Content and Image Budgets...");
  try {
    const archiveText = await fs.readFile(archiveJsonPath, "utf8");
    const archive = JSON.parse(archiveText);

    if (!archive.intro || !archive.versions?.length) {
      console.error("  ❌ design-archive.json missing intro or versions array");
      passed = false;
    }

    const currentCount = archive.versions.filter((v) => v.current === true).length;
    if (currentCount !== 1) {
      console.error(`  ❌ Expected exactly 1 current version, found ${currentCount}`);
      passed = false;
    } else {
      console.log(`  ✓ Exactly 1 current version designated (${archive.versions.find((v) => v.current).name}).`);
    }

    for (const ver of archive.versions) {
      console.log(`  Checking version: ${ver.id} (${ver.name})...`);
      for (const img of ver.images) {
        const fullDiskPath = path.join(publicDir, img.full.replace(/^\//, ""));
        const thumbDiskPath = path.join(publicDir, img.thumb.replace(/^\//, ""));

        try {
          const fullStat = await fs.stat(fullDiskPath);
          const maxBudget = img.device === "mobile" ? BUDGETS.MOBILE_FULL : BUDGETS.DESKTOP_FULL;
          if (fullStat.size > maxBudget) {
            console.error(
              `    ❌ ${img.full} exceeds budget: ${(fullStat.size / 1024).toFixed(1)} KB > ${(maxBudget / 1024).toFixed(1)} KB`,
            );
            passed = false;
          }
        } catch {
          console.error(`    ❌ Full image file missing on disk: ${fullDiskPath}`);
          passed = false;
        }

        try {
          const thumbStat = await fs.stat(thumbDiskPath);
          if (thumbStat.size > BUDGETS.THUMB) {
            console.error(
              `    ❌ ${img.thumb} exceeds thumb budget: ${(thumbStat.size / 1024).toFixed(1)} KB > ${(BUDGETS.THUMB / 1024).toFixed(1)} KB`,
            );
            passed = false;
          }
        } catch {
          console.error(`    ❌ Thumb image file missing on disk: ${thumbDiskPath}`);
          passed = false;
        }

        if (!img.alt || img.alt.length < 5) {
          console.error(`    ❌ Image alt text is missing or too short: "${img.alt}"`);
          passed = false;
        }
      }
    }
    console.log(`  ✓ All ${archive.versions.length} versions and screenshots verified on disk.`);
  } catch (err) {
    console.error(`  ❌ Failed reading design-archive.json: ${err.message}`);
    passed = false;
  }

  if (!passed) {
    console.error("\n❌ seo:check failed. Please fix the reported issues.");
    process.exit(1);
  }

  console.log("\n✅ All SEO, Brand Assets & Design Archive checks PASSED!");
}

main().catch((err) => {
  console.error("❌ seo:check error:", err);
  process.exit(1);
});
