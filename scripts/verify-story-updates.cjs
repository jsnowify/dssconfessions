// Isolated UI/API/SQL verification. Never reads server/.env or live stories.
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");
const { chromium } = require("playwright");
const { startFixture } = require("./performance/fixture.cjs");

async function main() {
  const fixture = await startFixture();
  const root = path.resolve(__dirname, "../client/dist");
  const ui = http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      const proxy = http.request(new URL(req.url, fixture.origin), { method: req.method, headers: req.headers }, upstream => {
        res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res);
      });
      proxy.on("error", () => { res.writeHead(503); res.end(); });
      req.pipe(proxy); return;
    }
    const candidate = path.resolve(root, "." + new URL(req.url, "http://fixture").pathname);
    if (!candidate.startsWith(root + path.sep) && candidate !== root) { res.writeHead(404); res.end(); return; }
    const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, "index.html");
    res.writeHead(200, { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" })[path.extname(file)] || "text/html" });
    res.end(fs.readFileSync(file));
  }).listen(0, "127.0.0.1");
  await once(ui, "listening");
  const origin = `http://127.0.0.1:${ui.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 360, height: 844 }, reducedMotion: "reduce" });
    await page.route("**/*", route => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install();
    await page.goto(origin);
    await page.getByRole("heading", { name: "say it loud." }).waitFor();
    await page.locator(".hero-tile").first().waitFor();
    const insert = async () => (await fixture.db.query(`insert into public.confessions(recipient_to,sender_from,content,song_name,artist_name,spotify_url)
      values('SAMPLE NEW','ANONYMOUS','A purely fictional sample for checking fresh story updates.','Sample Song','Sample Artist',$1) returning id`,
      [`https://open.spotify.com/track/${fixture.track.id}`])).rows[0].id;
    await insert();
    await page.clock.fastForward(61000);
    const notice = page.getByRole("complementary", { name: "New confessions" });
    await notice.waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(__dirname, "../.vercel/new-confessions-360.png") });
    await notice.getByRole("button", { name: "Later", exact: true }).click();
    await page.clock.fastForward(61000);
    await page.waitForTimeout(100);
    assert.equal(await notice.count(), 0, "Later must suppress the same new story");
    await insert();
    await page.clock.fastForward(61000);
    await notice.waitFor();
    const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/confessions" && !new URL(response.url()).search);
    await notice.getByRole("button", { name: "Refresh", exact: true }).click();
    await refreshed;
    await notice.waitFor({ state: "detached" });
    const latest = await fetch(fixture.origin + "/api/confessions?latest=1").then(response => response.json());
    assert.equal(latest.length, 1);
    assert.deepEqual(Object.keys(latest[0]).sort(), ["created_at", "id"]);
    assert.equal((await fetch(fixture.origin + "/api/confessions?latest=bad")).status, 400);
    await fixture.db.query(`insert into public.replies(confession_id,song_name,artist_name,spotify_track_id)
      select $1,'Sample reply '||n,'Sample Artist',$2 from generate_series(1,500) n`, [fixture.id, fixture.track.id]);
    await page.goto(origin + "/confession/" + fixture.id);
    await page.getByRole("img", { name: "500 of 500 reply slots filled" }).waitFor();
    assert.equal(await page.getByRole("button", { name: /^Play Sample reply/ }).count(), 25);
    await page.getByRole("button", { name: "Show more songs (25 of 500)" }).click();
    assert.equal(await page.getByRole("button", { name: /^Play Sample reply/ }).count(), 50);
    assert.equal(await page.getByRole("button", { name: /Add your song/ }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole("img", { name: "500 of 500 reply slots filled" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(__dirname, "../.vercel/replies-500-360.png") });
    assert.deepEqual(errors, []);
    console.log("PASS: new-story prompt, Later, Refresh, private lightweight checks, 500-reply capacity, 25/50-row progressive display, 360px layout, no browser errors.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => ui.close(resolve));
    await fixture.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
