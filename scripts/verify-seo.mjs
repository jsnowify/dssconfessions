// Browser checks against built files with neutral API responses. This verifies
// page behavior, not Vercel's deployed routing or production Core Web Vitals.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { INDEXABLE_ROUTES } from "../client/src/seo/routes.js";
import { robotsForEnvironment } from "../client/src/seo/indexing.js";

const dist = path.resolve(import.meta.dirname, "../client/dist");
const build = JSON.parse(await readFile(path.join(dist, "seo-build.json"), "utf8"));
const types = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".html": "text/html" };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
    const filePath = path.resolve(dist, `.${pathname}`);
    if (!filePath.startsWith(dist + path.sep) && filePath !== dist) throw new Error("Outside build");
    const file = (await stat(filePath)).isDirectory() ? path.join(filePath, "index.html") : filePath;
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end("Not found"); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
  const staticPage = await staticContext.newPage();
  for (const route of INDEXABLE_ROUTES) {
    const response = await staticPage.goto(origin + route);
    assert.equal(response.status(), 200, route);
    assert.equal(await staticPage.locator("h1").count(), 1, route);
    assert.ok(await staticPage.getByRole("navigation", { name: "Main navigation", exact: true }).isVisible(), route);
    assert.ok(await staticPage.locator('a[href="/confess"]').count(), route);
    assert.ok(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: static mobile overflow`);
  }
  await staticContext.close();

  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: "reduce" });
  await context.route("**/api/**", route => route.fulfill({ contentType: "application/json", body: "[]" }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const route of INDEXABLE_ROUTES) {
    await page.goto(origin + route);
    await page.waitForFunction(() => !!document.getElementById("dynamic-jsonld"));
    assert.equal(await page.locator("h1").count(), 1, route);
    assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1, route);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), build.siteUrl + route, route);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), robotsForEnvironment("index, follow", build.environment), route);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: mobile overflow`);
  }
  await page.goto(origin + "/faq");
  await page.waitForFunction(() => !!document.getElementById("dynamic-jsonld"));
  const panel = page.locator("#faq-panel-how-many-song-replies");
  assert.equal(await panel.isVisible(), false);
  await page.locator("#faq-btn-how-many-song-replies").click();
  assert.equal(await panel.isVisible(), true);
  assert.ok((await panel.textContent()).includes("500"));
  await page.getByRole("link", { name: "DSSC Community Info", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dssc-confessions");
  await page.waitForFunction(() => document.title.includes("Song Dedications"));
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), robotsForEnvironment("index, follow", build.environment));
  assert.deepEqual(errors, []);
  console.log(`SEO browser checks passed: ${INDEXABLE_ROUTES.length} pages, with/without JavaScript, 360px layout, FAQ, keyboard navigation, metadata (${build.environment || "local production validation"}).`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
