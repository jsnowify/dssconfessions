import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { sitemapXml } from "./seo-assets.mjs";
import { robotsForEnvironment } from "../client/src/seo/indexing.js";
import {
  ROUTES_CONFIG,
  INDEXABLE_ROUTES,
  CANONICAL_DEFINITION,
  DISCLOSURE_SENTENCE,
  OFFICIAL_COLLEGE_URL,
} from "../client/src/seo/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "client", "public");
const distDir = path.join(rootDir, "client", "dist");
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

const FORBIDDEN_SCHEMAS = [
  "CollegeOrUniversity",
  "EducationalOrganization",
  "LocalBusiness",
];

async function main() {
  console.log("🔍 Running Comprehensive SEO, Brand, Local SEO & AEO Verification (seo:check)...");
  let passed = true;
  const build = JSON.parse(await fs.readFile(path.join(distDir, "seo-build.json"), "utf8"));
  const titles = new Set();
  const descriptions = new Set();

  // 1. Verify Brand Assets
  console.log("\n[1/6] Verifying Brand Assets...");
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
  console.log("\n[2/6] Verifying site.webmanifest...");
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
  console.log("\n[3/6] Verifying client/index.html Head Metadata...");
  try {
    const html = await fs.readFile(indexHtmlPath, "utf8");
    const requiredChecks = [
      { name: "lang='en-PH' attribute", test: html.includes('lang="en-PH"') },
      { name: "geo.region='PH-DAS' meta", test: html.includes('content="PH-DAS"') },
      { name: "og:locale='en_PH' meta", test: html.includes('content="en_PH"') },
      { name: "hreflang='en-PH' alternate", test: html.includes('hreflang="en-PH"') },
      { name: "hreflang='x-default' alternate", test: html.includes('hreflang="x-default"') },
      { name: "favicon.svg link", test: html.includes('href="/favicon.svg"') },
      { name: "site.webmanifest link", test: html.includes('href="/site.webmanifest"') },
      { name: "theme-color meta", test: html.includes('content="#F6F9FF"') },
      { name: "og-default.png meta", test: html.includes('og-default.png') },
      { name: "JSON-LD logo schema", test: html.includes('logo-mark.svg') },
      { name: "No 'DSSC Portal' in alternateName", test: !html.includes('"DSSC Portal"') },
    ];

    for (const check of requiredChecks) {
      if (check.test) {
        console.log(`  ✓ ${check.name}`);
      } else {
        console.error(`  ❌ Missing or failed in index.html: ${check.name}`);
        passed = false;
      }
    }

    for (const forbidden of FORBIDDEN_SCHEMAS) {
      if (html.includes(`"@type": "${forbidden}"`) || html.includes(`"@type":"${forbidden}"`)) {
        console.error(`  ❌ Forbidden schema type found in index.html: ${forbidden}`);
        passed = false;
      }
    }
  } catch (err) {
    console.error(`  ❌ Failed reading index.html: ${err.message}`);
    passed = false;
  }

  // 4. Verify design-archive.json and Images
  console.log("\n[4/6] Verifying Design Archive Content and Image Budgets...");
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

  // 5. Verify Prerendered Static Pages (client/dist/)
  console.log("\n[5/6] Verifying Prerendered HTML Outputs & Local SEO Invariants...");
  const dsscLandingPath = path.join(distDir, "dssc-confessions", "index.html");
  const homeHtmlPath = path.join(distDir, "index.html");
  const aboutHtmlPath = path.join(distDir, "about", "index.html");

  try {
    const landingHtml = await fs.readFile(dsscLandingPath, "utf8");

    // 5.1 One and only one <h1>
    const h1Matches = landingHtml.match(/<h1\b[^>]*>/gi);
    if (!h1Matches || h1Matches.length !== 1) {
      console.error(`  ❌ /dssc-confessions expected exactly 1 <h1>, found ${h1Matches ? h1Matches.length : 0}`);
      passed = false;
    } else {
      console.log("  ✓ /dssc-confessions has exactly one <h1>");
    }

    // 5.2 Non-affiliation disclosure sentence
    if (!landingHtml.toLowerCase().includes("not affiliated with or endorsed by davao del sur state college")) {
      console.error("  ❌ /dssc-confessions missing non-affiliation disclosure sentence");
      passed = false;
    } else {
      console.log("  ✓ /dssc-confessions contains non-affiliation disclosure");
    }

    // 5.3 Disambiguation link to official college
    if (!landingHtml.includes(OFFICIAL_COLLEGE_URL)) {
      console.error(`  ❌ /dssc-confessions missing official college link (${OFFICIAL_COLLEGE_URL})`);
      passed = false;
    } else {
      console.log(`  ✓ /dssc-confessions contains official disambiguation link: ${OFFICIAL_COLLEGE_URL}`);
    }

    // 5.4 JSON-LD disambiguatingDescription check
    if (!landingHtml.includes('"disambiguatingDescription"')) {
      console.error("  ❌ /dssc-confessions JSON-LD missing disambiguatingDescription");
      passed = false;
    } else {
      console.log("  ✓ /dssc-confessions JSON-LD contains disambiguatingDescription");
    }

    // 5.5 No blacklisted schema types
    for (const forbidden of FORBIDDEN_SCHEMAS) {
      if (
        landingHtml.includes(`"@type": "${forbidden}"`) ||
        landingHtml.includes(`"@type":"${forbidden}"`)
      ) {
        console.error(`  ❌ Forbidden schema type found in /dssc-confessions: ${forbidden}`);
        passed = false;
      }
    }

    // Require one consistent metadata graph and complete public page content.
    for (const route of INDEXABLE_ROUTES) {
      const html = await fs.readFile(path.join(distDir, route === "/" ? "" : route.slice(1), "index.html"), "utf8");
      const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
      const alternates = [...html.matchAll(/hreflang="en-PH"/g)];
      if (blocks.length !== 1 || alternates.length !== 1 || !html.includes(`name="robots" content="${robotsForEnvironment(ROUTES_CONFIG[route].robots, build.environment)}`)) {
        throw new Error(`${route} must have one route graph, one language alternate, and indexable metadata`);
      }
      const title = html.match(/<title>(.*?)<\/title>/i)?.[1];
      const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1];
      if (!title || !description || titles.has(title) || descriptions.has(description)) {
        throw new Error(`${route} needs a unique title and description`);
      }
      titles.add(title);
      descriptions.add(description);
      if ((html.match(/<h1\b/gi) || []).length !== 1) throw new Error(`${route} needs exactly one H1`);
      if (!html.includes(`rel="canonical" href="${build.siteUrl}${route}"`)) throw new Error(`${route} canonical mismatch`);
      const nodes = JSON.parse(blocks[0][1]);
      const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      const faq = nodes.find(node => node["@type"] === "FAQPage");
      if (faq) for (const question of faq.mainEntity) {
        const escaped = question.acceptedAnswer.text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
        if (!text.includes(escaped)) throw new Error(`FAQ answer missing from HTML: ${question.name}`);
      }
    }
    console.log("  OK All public routes have consistent metadata; FAQ answers exist in page HTML");

    // 5.7 Check home and about prerendered files for disclosure
    const homeHtml = await fs.readFile(homeHtmlPath, "utf8");
    if (!homeHtml.toLowerCase().includes("not affiliated with or endorsed by davao del sur state college")) {
      console.error("  ❌ Prerendered Home (/) missing non-affiliation disclosure");
      passed = false;
    } else {
      console.log("  ✓ Prerendered Home (/) contains non-affiliation disclosure");
    }

    const aboutHtml = await fs.readFile(aboutHtmlPath, "utf8");
    if (!aboutHtml.toLowerCase().includes("not affiliated with or endorsed by davao del sur state college")) {
      console.error("  ❌ Prerendered About (/about) missing non-affiliation disclosure");
      passed = false;
    } else {
      console.log("  ✓ Prerendered About (/about) contains non-affiliation disclosure");
    }
  } catch (err) {
    console.error(`  ❌ Failed verifying prerendered HTML files (run npm run build first): ${err.message}`);
    passed = false;
  }

  // 6. Verify Crawlers, AI Orientation (llms.txt) & Sitemap
  console.log("\n[6/6] Verifying robots.txt, sitemap.xml, llms.txt, and llms-full.txt...");
  try {
    // 6.1 robots.txt
    const robotsPath = path.join(publicDir, "robots.txt");
    const robots = await fs.readFile(robotsPath, "utf8");
    if (!robots.includes("Disallow: /confession/") || !robots.includes("Disallow: /api/")) {
      console.error("  ❌ robots.txt must disallow /confession/ and /api/");
      passed = false;
    } else {
      console.log("  ✓ robots.txt correctly disallows /confession/ and /api/");
    }

    if (!robots.includes("Sitemap: https://dssconfessions.vercel.app/sitemap.xml")) {
      console.error("  ❌ robots.txt missing Sitemap declaration");
      passed = false;
    } else {
      console.log("  ✓ robots.txt points to correct canonical sitemap.xml");
    }

    // 6.2 sitemap.xml
    const sitemapPath = path.join(distDir, "sitemap.xml");
    const sitemap = await fs.readFile(sitemapPath, "utf8");
    if (sitemap.includes("/confession/")) {
      console.error("  ❌ sitemap.xml must NEVER contain individual /confession/ URLs");
      passed = false;
    } else {
      console.log("  ✓ sitemap.xml contains 0 /confession/ URLs (privacy preserved)");
    }

    if (sitemap !== sitemapXml(build.siteUrl, build.environment)) throw new Error("Generated sitemap does not match current canonical indexable routes");
    for (const route of INDEXABLE_ROUTES.filter(route => robotsForEnvironment(ROUTES_CONFIG[route].robots, build.environment).split(/[,\s]+/).includes("index"))) {
      const expectedUrl = `<loc>${build.siteUrl}${route}</loc>`;
      const occurrences = (sitemap.match(new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
      if (occurrences !== 1) {
        console.error(`  ❌ sitemap.xml missing or duplicate entry for ${route} (count: ${occurrences})`);
        passed = false;
      }
    }
    console.log("  OK Generated sitemap matches the build environment and canonical routes");

    // 6.3 llms.txt and llms-full.txt
    const llmsPath = path.join(publicDir, "llms.txt");
    const llms = await fs.readFile(llmsPath, "utf8");
    if (!llms.includes(CANONICAL_DEFINITION)) {
      console.error("  ❌ llms.txt missing canonical definition");
      passed = false;
    } else {
      console.log("  ✓ llms.txt contains canonical definition");
    }
    if (!llms.toLowerCase().includes("not affiliated with or endorsed by davao del sur state college")) {
      console.error("  ❌ llms.txt missing non-affiliation disclosure");
      passed = false;
    } else {
      console.log("  ✓ llms.txt contains non-affiliation disclosure");
    }

    const llmsFullPath = path.join(publicDir, "llms-full.txt");
    const llmsFull = await fs.readFile(llmsFullPath, "utf8");
    if (!llmsFull.includes(CANONICAL_DEFINITION) || !llmsFull.includes(OFFICIAL_COLLEGE_URL)) {
      console.error("  ❌ llms-full.txt missing canonical definition or official college URL");
      passed = false;
    } else {
      console.log("  ✓ llms-full.txt contains canonical definition and official college URL");
    }
  } catch (err) {
    console.error(`  ❌ Failed verifying crawler/AI orientation files: ${err.message}`);
    passed = false;
  }

  if (!passed) {
    console.error("\n❌ seo:check failed. Please fix the reported issues.");
    process.exit(1);
  }

  console.log("\n✅ All Brand, SEO, Local SEO, Schema & AEO checks PASSED!");
}

main().catch((err) => {
  console.error("❌ seo:check error:", err);
  process.exit(1);
});
