const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "../..");
const moduleAt = relative => import(pathToFileURL(path.join(root, relative)).href);

test("sitemap follows current route configuration and excludes noindex pages and previews", async () => {
  const { sitemapXml, canonicalOrigin } = await moduleAt("scripts/seo-assets.mjs");
  const { ROUTES_CONFIG } = await moduleAt("client/src/seo/routes.js");
  assert.equal(canonicalOrigin("https://example.com/"), "https://example.com");
  for (const url of ["https://example.com/path", "https://user:pass@example.com", "https://example.com?to=name", "ftp://example.com"]) {
    assert.throws(() => canonicalOrigin(url));
  }
  ROUTES_CONFIG["/test-public"] = { path: "/test-public", robots: "index, follow" };
  ROUTES_CONFIG["/test-private"] = { path: "/test-private", robots: "noindex, follow" };
  try {
    const xml = sitemapXml("https://example.com/");
    assert.ok(xml.includes("<loc>https://example.com/test-public</loc>"));
    assert.ok(!xml.includes("test-private"));
    assert.ok(!xml.includes("dssconfessions.vercel.app"));
    assert.ok(!xml.includes("/confession/"));
    assert.ok(!sitemapXml("https://example.com", "preview").includes("<loc>"));
  } finally {
    delete ROUTES_CONFIG["/test-public"];
    delete ROUTES_CONFIG["/test-private"];
  }
});

test("preview noindex persists independently of page-level index directives", async () => {
  const { robotsForEnvironment } = await moduleAt("client/src/seo/indexing.js");
  for (const environment of ["preview", "development", "staging"]) {
    assert.equal(robotsForEnvironment("index, follow", environment), "noindex, nofollow");
  }
  assert.equal(robotsForEnvironment("index, follow", "production"), "index, follow");
  assert.equal(robotsForEnvironment("noindex, nofollow", "production"), "noindex, nofollow");
});

test("Vercel routes preserve public pages and aliases without a homepage catch-all", async () => {
  const { INDEXABLE_ROUTES } = await moduleAt("client/src/seo/routes.js");
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  for (const route of INDEXABLE_ROUTES.filter(route => route !== "/")) {
    assert.ok(config.rewrites.some(rule => rule.source === route && rule.destination === `${route}/index.html`), route);
  }
  for (const alias of ["/submit", "/guides/how-to-send-an-anonymous-confession", "/confessions/:id"]) {
    assert.ok(config.rewrites.some(rule => rule.source === alias), alias);
  }
  for (const key of ["to", "search", "id", "confession"]) {
    assert.ok(config.headers.some(rule => rule.has?.some(condition => condition.type === "query" && condition.key === key) &&
      rule.headers.some(header => header.key === "X-Robots-Tag" && header.value.includes("noindex"))), key);
  }
  assert.ok(!config.rewrites.some(rule => /\.\*|:path\*/.test(rule.source) && rule.destination === "/index.html"));
  assert.ok(config.rewrites.some(rule => rule.source === "/api/:path*" && rule.destination === "/api/index"));
  assert.ok(config.rewrites.some(rule => rule.source === "/confession/:id" && rule.destination === "/api/index"));
});
