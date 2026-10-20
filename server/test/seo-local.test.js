const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..");
const publicDir = path.join(rootDir, "client", "public");
const distDir = path.join(rootDir, "client", "dist");
const indexHtmlPath = path.join(rootDir, "client", "index.html");
const routesJsPath = path.join(rootDir, "client", "src", "seo", "routes.js");

const FORBIDDEN_SCHEMAS = [
  "CollegeOrUniversity",
  "EducationalOrganization",
  "LocalBusiness",
];

const EXPECTED_ROUTES = [
  "/",
  "/dssc-confessions",
  "/browse",
  "/confess",
  "/about",
  "/faq",
  "/privacy",
  "/guides/how-to-send-an-anonymous-song-confession",
  "/guides/how-to-choose-a-song-for-your-confession",
  "/guides/is-it-safe-to-send-an-anonymous-confession",
];

test("Local SEO, GEO, AEO & Schema Invariants Suite", async (t) => {
  await t.test("routes.js defines valid local SEO and canonical constants", () => {
    assert.ok(fs.existsSync(routesJsPath), "routes.js must exist");
    const content = fs.readFileSync(routesJsPath, "utf8") + fs.readFileSync(path.join(rootDir, "client/src/seo/identity.js"), "utf8");

    assert.ok(content.includes('SITE_NAME = "DSSC Confessions"'), "SITE_NAME must be DSSC Confessions");
    assert.ok(content.includes('DEFAULT_LANG = "en-PH"'), "DEFAULT_LANG must be en-PH");
    assert.ok(content.includes('DEFAULT_LOCALE = "en_PH"'), "DEFAULT_LOCALE must be en_PH");
    assert.ok(content.includes('GEO_REGION = "PH-DAS"'), "GEO_REGION must be PH-DAS");
    assert.ok(
      content.includes('OFFICIAL_COLLEGE_URL = "https://www.dssc.edu.ph/"'),
      "OFFICIAL_COLLEGE_URL must point to https://www.dssc.edu.ph/",
    );

    // Verify all 10 indexable routes are listed in routes.js
    for (const route of EXPECTED_ROUTES) {
      assert.ok(content.includes(`"${route}"`), `routes.js must configure route ${route}`);
    }
  });

  await t.test("client/index.html obeys schema safety and localization rules", () => {
    const html = fs.readFileSync(indexHtmlPath, "utf8");

    assert.ok(html.includes('lang="en-PH"'), "index.html must have lang='en-PH'");
    assert.ok(html.includes('content="PH-DAS"'), "index.html must declare geo.region PH-DAS");
    assert.ok(html.includes('content="en_PH"'), "index.html must declare og:locale en_PH");
    assert.ok(html.includes('hreflang="en-PH"'), "index.html must have hreflang alternate");

    // No forbidden schemas
    for (const forbidden of FORBIDDEN_SCHEMAS) {
      assert.ok(
        !html.includes(`"${forbidden}"`),
        `index.html must not use forbidden schema ${forbidden}`,
      );
    }

    // Never impersonate portal
    assert.ok(
      !html.includes('"DSSC Portal"'),
      "index.html alternateName must not include 'DSSC Portal'",
    );
  });

  await t.test("robots.txt enforces privacy and points to canonical sitemap", () => {
    const robotsPath = path.join(publicDir, "robots.txt");
    assert.ok(fs.existsSync(robotsPath), "robots.txt must exist");
    const robots = fs.readFileSync(robotsPath, "utf8");

    assert.ok(robots.includes("Disallow: /confession/"), "robots.txt must disallow /confession/");
    assert.ok(robots.includes("Disallow: /api/"), "robots.txt must disallow /api/");
    assert.ok(robots.includes("Disallow: /*?to="), "robots.txt must disallow name filters");
    assert.ok(
      robots.includes("Sitemap: https://dssconfessions.vercel.app/sitemap.xml"),
      "robots.txt must reference sitemap.xml",
    );
  });

  await t.test("sitemap.xml has all 10 indexable routes, 0 confession URLs", () => {
    const sitemapPath = path.join(publicDir, "sitemap.xml");
    assert.ok(fs.existsSync(sitemapPath), "sitemap.xml must exist");
    const sitemap = fs.readFileSync(sitemapPath, "utf8");

    assert.ok(!sitemap.includes("/confession/"), "sitemap.xml must not expose confessions");

    for (const route of EXPECTED_ROUTES) {
      const loc = `<loc>https://dssconfessions.vercel.app${route === "/" ? "/" : route}</loc>`;
      const count = (sitemap.match(new RegExp(loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
      assert.equal(count, 1, `sitemap.xml must contain ${loc} exactly once`);
    }
  });

  await t.test("llms.txt and llms-full.txt provide generative AI orientation", () => {
    const llmsPath = path.join(publicDir, "llms.txt");
    const llmsFullPath = path.join(publicDir, "llms-full.txt");

    assert.ok(fs.existsSync(llmsPath), "llms.txt must exist");
    assert.ok(fs.existsSync(llmsFullPath), "llms-full.txt must exist");

    const llms = fs.readFileSync(llmsPath, "utf8");
    const llmsFull = fs.readFileSync(llmsFullPath, "utf8");

    const disclosurePhrase = "not affiliated with or endorsed by davao del sur state college";

    assert.ok(
      llms.toLowerCase().includes(disclosurePhrase),
      "llms.txt must contain non-affiliation disclosure",
    );
    assert.ok(
      llmsFull.toLowerCase().includes(disclosurePhrase),
      "llms-full.txt must contain non-affiliation disclosure",
    );
    assert.ok(
      llms.includes("https://www.dssc.edu.ph/"),
      "llms.txt must link to official college portal",
    );
    for (const reference of [llms, llmsFull]) {
      assert.ok(reference.includes("up to 500 anonymous song replies"));
      assert.ok(!reference.includes("10-track"));
    }
    assert.ok(
      llmsFull.includes("https://www.dssc.edu.ph/"),
      "llms-full.txt must link to official college portal",
    );
  });

  await t.test("route preloads fetch only the current screen and keep archive code on demand", () => {
    if (!fs.existsSync(path.join(distDir, ".vite/manifest.json"))) return;
    for (const [route, expected] of [["", null], ["browse", "BrowseView"], ["confess", "SubmitView"], ["faq", "FaqView"], ["dssc-confessions", "DsscLandingView"]]) {
      const html = fs.readFileSync(path.join(distDir, route, "index.html"), "utf8");
      const links = [...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map(m => m[1]);
      if (expected) assert.ok(links.some(link => link.includes(expected)), route);
      else assert.equal(links.length, 0);
      for (const link of links) {
        assert.ok(fs.existsSync(path.join(distDir, link.replace(/^\//, ""))));
        assert.ok(!/DesignArchive|BotAdmin|DetailsView/.test(link));
      }
    }
  });
  await t.test("informational pages ship their full content before JavaScript runs", () => {
    const expected = {
      "dssc-confessions": ["What Data is Stored?", "Who Created DSSC Confessions?"],
      "faq": ["faq-panel-how-many-song-replies", "up to 500 anonymous song replies"],
      "privacy": ["1. Our Zero-IP Anonymity Guarantee"],
      "guides/how-to-send-an-anonymous-song-confession": ["Quick Answer", "Step 1"],
      "guides/how-to-choose-a-song-for-your-confession": ["Quick Recommendation"],
      "guides/is-it-safe-to-send-an-anonymous-confession": ["Direct Answer"],
    };
    for (const [route, phrases] of Object.entries(expected)) {
      const file = path.join(distDir, route, "index.html");
      assert.ok(fs.existsSync(file), "Run npm run build before the SEO suite");
      const html = fs.readFileSync(file, "utf8");
      const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      for (const phrase of phrases) assert.ok(body.includes(phrase), `${route}: ${phrase}`);
      assert.equal((html.match(/type="application\/ld\+json"/g) || []).length, 1, route);
      assert.equal((html.match(/hreflang="en-PH"/g) || []).length, 1, route);
    }
  });
  await t.test("Prerendered outputs respect single h1 and disclosure invariants", () => {
    const landingPath = path.join(distDir, "dssc-confessions", "index.html");
    const homePath = path.join(distDir, "index.html");
    const aboutPath = path.join(distDir, "about", "index.html");

    // Only test if dist has been built
    if (!fs.existsSync(landingPath)) {
      return;
    }

    const landingHtml = fs.readFileSync(landingPath, "utf8");

    // Single <h1>
    const h1Count = (landingHtml.match(/<h1\b[^>]*>/gi) || []).length;
    assert.equal(h1Count, 1, "/dssc-confessions must have exactly one <h1>");

    // Disclosure and official link
    assert.ok(
      landingHtml.toLowerCase().includes("not affiliated with or endorsed by davao del sur state college"),
      "Landing page must contain non-affiliation disclosure",
    );
    assert.ok(
      landingHtml.includes("https://www.dssc.edu.ph/"),
      "Landing page must contain official college link",
    );

    // disambiguatingDescription
    assert.ok(
      landingHtml.includes('"disambiguatingDescription"'),
      "Landing page JSON-LD must contain disambiguatingDescription",
    );

    // Home and About disclosures
    const homeHtml = fs.readFileSync(homePath, "utf8");
    const aboutHtml = fs.readFileSync(aboutPath, "utf8");
    assert.ok(
      homeHtml.toLowerCase().includes("not affiliated with or endorsed by davao del sur state college"),
      "Home must contain non-affiliation disclosure",
    );
    assert.ok(
      aboutHtml.toLowerCase().includes("not affiliated with or endorsed by davao del sur state college"),
      "About must contain non-affiliation disclosure",
    );
  });
});

