import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fixtureModule from './fixture.cjs';

const root = path.resolve(import.meta.dirname, '../..');
const phase = process.argv[2];
const interactionsOnly = process.argv.includes('--interactions-only');
const stressOnly = process.argv.includes('--stress-only');
if (!['before', 'after'].includes(phase)) throw new Error('Usage: npm run perf:audit -- before|after');
const dist = phase === 'before' ? path.join(root, '.vercel/performance/before/site') : path.join(root, 'client/dist');
await fs.access(path.join(dist, 'index.html'));
const output = path.join(root, 'performance-results');
await fs.mkdir(output, { recursive: true });
const fixture = await fixtureModule.startFixture();
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
// Precompressed static assets eliminate per-request compression noise.
const files = new Map();
async function collect(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await collect(file);
    else { const data = await fs.readFile(file); files.set('/' + path.relative(dist, file).replaceAll('\\', '/'), { data, gzip: gzipSync(data), type: types[path.extname(file)] || 'application/octet-stream' }); }
  }
}
await collect(dist);
const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const response = await fetch(fixture.origin + req.url, { method: req.method,
        headers: { ...req.headers, host: new URL(fixture.origin).host },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
        duplex: 'half' });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const name = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const file = files.get(name) || files.get(name.replace(/\/$/, '') + '/index.html') || files.get('/index.html');
    const gzip = /gzip/.test(req.headers['accept-encoding'] || '');
    const body = gzip ? file.gzip : file.data;
    res.writeHead(200, { 'content-type': file.type, 'cache-control': 'no-store',
      'content-length': body.length, ...(gzip ? { 'content-encoding': 'gzip' } : {}) });
    res.end(body);
  } catch { res.writeHead(500); res.end('Fixture request failed'); }
});
await new Promise(r => server.listen(4173, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const screens = [
  ['Home', '/', '.pinboard .record-card'], ['Browse', '/browse', '.browse-view'],
  ['Browse results', '/browse?to=SAMPLE', '.search-results, .confession-grid, .record-card'],
  ['Confess', '/confess', '.submit-view'], ['Confession', `/confession/${fixture.id}?_spa=1`, '.detail-card-wrap'],
  ['About', '/about', 'main h1'], ['DSSC', '/dssc-confessions', 'main h1'],
  ['FAQ', '/faq', 'main h1'], ['Privacy', '/privacy', 'main h1'],
  ['Send guide', '/guides/how-to-send-an-anonymous-song-confession', 'main h1'],
  ['Song guide', '/guides/how-to-choose-a-song-for-your-confession', 'main h1'],
  ['Safety guide', '/guides/is-it-safe-to-send-an-anonymous-confession', 'main h1'],
  ['Bot login', '/admin/bots', '.bot-login'],
];
let client = 1;
async function contextFor(viewport = { width: 390, height: 844 }, reducedMotion = 'no-preference') {
  const n = client++;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion,
    extraHTTPHeaders: { 'x-forwarded-for': `192.0.${Math.floor(n / 250)}.${n % 250 + 1}` } });
  // Every /api request reaches ONLY the fixture above. All third-party requests
  // (including fonts/CDNs/Spotify embeds) are neutral and deterministic.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
    if (route.request().resourceType() === 'document') return route.fulfill({ contentType: 'text/html', body: '<html><body>Sample music player</body></html>' });
    return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#EAF1FF"/></svg>' });
  });
  await context.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, blocking: 0, longTasks: 0 };
    for (const type of ['largest-contentful-paint', 'layout-shift', 'longtask']) {
      new PerformanceObserver(list => { for (const e of list.getEntries()) {
        if (type === 'largest-contentful-paint') window.__perf.lcp = e.startTime;
        if (type === 'layout-shift' && !e.hadRecentInput) window.__perf.cls += e.value;
        if (type === 'longtask') { window.__perf.longTasks++; window.__perf.blocking += Math.max(0, e.duration - 50); }
      } }).observe({ type, buffered: true });
    }
  });
  return context;
}
const med = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];
const round = n => Math.round(n * 100) / 100;
const results = [];
try {
  const stress = [];
  // Real Express routes + actual PostgreSQL RPCs; same finite workload each phase.
  for (const concurrency of interactionsOnly ? [] : [10, 25, 50]) {
    const latencies = [], statuses = {}, requests = 300;
    let next = 0;
    const start = performance.now();
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (next < requests) {
        const i = next++, begin = performance.now();
        const urls = ['/api/confessions', '/api/confessions?to=SAMPLE', `/api/confessions/${fixture.id}/settings`, `/api/confessions/${fixture.id}/replies`, '/api/search-song?q=sample'];
        const res = await fetch(fixture.origin + urls[i % urls.length], { headers: { 'x-forwarded-for': `198.${concurrency}.${Math.floor(i / 250)}.${i % 250 + 1}` } });
        await res.arrayBuffer(); statuses[res.status] = (statuses[res.status] || 0) + 1;
        latencies.push(performance.now() - begin);
      }
    }));
    const elapsed = performance.now() - start;
    assert.deepEqual(statuses, { 200: requests }, 'unexpected stress errors');
    const row = { concurrency, requests, statuses, throughput: round(requests * 1000 / elapsed), p50: round(med(latencies)), p95: round(percentile(latencies, .95)), max: round(Math.max(...latencies)) };
    stress.push(row); console.log('stress', JSON.stringify(row));
  }
  const guard = await Promise.all(Array.from({ length: 70 }, () => fetch(fixture.origin + '/api/confessions', { headers: { 'x-forwarded-for': '203.0.113.25' } })));
  const rateLimit = { allowed: guard.filter(r => r.status === 200).length, rejected: guard.filter(r => r.status === 429).length, retryAfter: guard.find(r => r.status === 429)?.headers.get('retry-after') };
  await Promise.all(guard.map(r => r.arrayBuffer()));
  assert.equal(rateLimit.allowed, 60); assert.equal(rateLimit.rejected, 10);
  await fixture.db.exec("delete from public.search_terms; delete from app_private.api_rate_limits;");
  for (const [name, url, selector] of interactionsOnly || stressOnly ? [] : screens) {
    const runs = [];
    for (let repeat = 0; repeat < 3; repeat++) {
      const context = await contextFor();
      const page = await context.newPage();
      const errors = [], api = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.url().startsWith(origin + '/api/')) api.push(new URL(request.url()).pathname + new URL(request.url()).search); });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 200000, uploadThroughput: 100000, connectionType: 'cellular4g' });
      await page.goto(origin + url, { waitUntil: 'domcontentloaded' });
      await page.locator('#root .site-shell').waitFor();
      await page.locator(selector).first().waitFor();
      const ready = await page.evaluate(() => performance.now());
      await page.waitForTimeout(1600);
      const measurement = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return { ...window.__perf, jsBytes: resources.filter(e => /\.js(?:\?|$)/.test(e.name)).reduce((n, e) => n + e.encodedBodySize, 0),
          scripts: resources.filter(e => /\.js(?:\?|$)/.test(e.name)).length,
          overflow: document.documentElement.scrollWidth > innerWidth,
          archiveRequests: resources.filter(e => e.name.includes('/design-archive/')).length };
      });
      assert.deepEqual(errors, [], name + ' runtime errors');
      assert.equal(measurement.overflow, false, name + ' mobile overflow');
      assert.equal(measurement.archiveRequests, 0, name + ' eagerly loaded archive');
      runs.push({ ...measurement, ready, apiRequests: api.length, api });
      await context.close();
    }
    const row = { name, url, runs, median: Object.fromEntries(['ready', 'lcp', 'cls', 'blocking', 'longTasks', 'jsBytes', 'scripts', 'apiRequests'].map(k => [k, round(med(runs.map(r => r[k])))])) };
    results.push(row);
    console.log(phase, name, JSON.stringify(row.median));
  }
  const interactions = {};
  if (!stressOnly && (interactionsOnly || phase === 'after')) {
    const context = await contextFor({ width: 1280, height: 900 }, 'reduce');
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.url().includes('/api/')) requests.push({ url: r.url(), body: r.postData() }); });
    await page.goto(origin + '/browse?to=SAMPLE');
    await page.locator('.record-card').first().waitFor();
    await page.waitForTimeout(300);
    const startRequests = requests.length;
    await page.locator('#browse-search-input').fill('SAMPLE EDIT');
    await page.waitForTimeout(500);
    interactions.browseEdit = { value: await page.locator('#browse-search-input').inputValue(), requestsWhileTyping: requests.length - startRequests };
    if (phase === 'after') {
      assert.equal(interactions.browseEdit.value, 'SAMPLE EDIT');
      assert.equal(interactions.browseEdit.requestsWhileTyping, 0);
    }
    await page.goto(origin + '/');
    await page.locator('.pinboard .record-card').first().waitFor();
    const card = page.locator('.pinboard .record-card').first();
    await card.scrollIntoViewIfNeeded();
    await card.getByRole('button', { name: /^Play / }).scrollIntoViewIfNeeded();
    await card.getByRole('button', { name: /^Play / }).click();
    await page.locator('.detail-card-wrap').waitFor();
    const expectedScroll = await page.evaluate(() => history.state.scrollY);
    await page.goBack();
    await page.waitForTimeout(200);
    interactions.history = { expected: expectedScroll, actual: await page.evaluate(() => scrollY) };
    if (phase === 'after') assert.ok(Math.abs(interactions.history.expected - interactions.history.actual) <= 2, 'history scroll restoration: ' + JSON.stringify(interactions.history));
    const pokeStart = requests.length;
    const poke = page.locator('.pinboard .record-card').first().getByRole('button', { name: /^Poke this confession/ });
    await poke.evaluate(button => { for (let i = 0; i < 100; i++) button.click(); });
    await page.waitForTimeout(1100);
    const bursts = requests.slice(pokeStart).filter(r => r.url.endsWith('/poke'));
    interactions.pokeBurst = { taps: 100, requests: bursts.length, amount: bursts.reduce((n, r) => n + JSON.parse(r.body).amount, 0) };
    assert.equal(interactions.pokeBurst.amount, 100);
    assert.ok(bursts.length <= 2, 'poke batching');
    await page.locator('.pinboard .record-card').first().getByRole('button', { name: /^Play / }).click();
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    const historyLength = await page.evaluate(() => history.length);
    const lockedAt = await page.evaluate(() => document.body.style.top);
    await page.getByRole('button', { name: 'Close Share this record' }).click();
    assert.equal(await page.evaluate(() => history.length), historyLength);
    assert.equal(await page.evaluate(() => document.body.style.position), '');
    interactions.share = { historyUnchanged: true, restoredScroll: await page.evaluate(() => scrollY), lockedAt };
    await page.goto(origin + '/confess');
    const songSearch = page.getByPlaceholder('Search Spotify by song title or artist...');
    const searchStart = requests.length;
    await songSearch.pressSequentially('sample song', { delay: 20 });
    await page.locator('.song-option').first().waitFor();
    interactions.songSearch = { characters: 11, requests: requests.slice(searchStart).filter(r => r.url.includes('/search-song')).length };
    assert.equal(interactions.songSearch.requests, 1);
    await page.locator('.song-option').first().click();
    await page.goto(origin + '/admin/bots');
    await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    interactions.admin = { signedIn: true };
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
    interactions.admin.signedOut = true;
    await page.goto(origin + '/about');
    await page.locator('#root .site-shell').waitFor();
    await page.locator('button[aria-controls="design-archive-panel"]').click();
    await page.getByRole('button', { name: /^View full screenshots/ }).first().click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Close lightbox' }).click();
    interactions.archive = { opensAndCloses: true };
    assert.deepEqual(errors, []);
    await context.close();
    if (phase === 'after') {
      const narrow = await contextFor({ width: 360, height: 800 }, 'reduce');
      const narrowPage = await narrow.newPage();
      for (const [name, url, selector] of screens) {
        await narrowPage.goto(origin + url);
        await narrowPage.locator('#root .site-shell').waitFor();
        await narrowPage.locator(selector).first().waitFor();
        await narrowPage.waitForTimeout(150);
        assert.equal(await narrowPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name + ' 360px overflow');
      }
      interactions.narrowViewport = { width: 360, screens: screens.length, overflow: false };
      await narrow.close();
      // Six simultaneous browsers, eight in-page navigations each.
      const begin = performance.now();
      await Promise.all(Array.from({ length: 6 }, async () => {
        const c = await contextFor({ width: 1280, height: 900 });
        const p = await c.newPage(), failures = [];
        p.on('pageerror', e => failures.push(e.message));
        await p.goto(origin + '/');
        await p.locator('.pinboard .record-card').first().waitFor();
        for (const href of ['/browse', '/confess', '/about', '/', '/browse', '/confess', '/about', '/']) {
          await p.locator(`.desktop-nav a[href="${href}"]`).click();
          await p.waitForFunction(() => !document.querySelector('main [role="status"]')?.textContent.includes('Loading page'));
          await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        }
        assert.deepEqual(failures, []);
        await c.close();
      }));
      interactions.browserStress = { concurrentVisitors: 6, navigations: 48, runtimeErrors: 0, elapsedMs: round(performance.now() - begin) };
    }
    console.log('interactions', JSON.stringify(interactions));
  }
  const writes = {};
  if (phase === 'after') {
    const count = async () => Number((await fixture.db.query('select poke_count from public.confessions where id=$1', [fixture.id])).rows[0].poke_count);
    const initial = await count();
    const pokeResponses = await Promise.all(Array.from({ length: 100 }, () => fetch(`${fixture.origin}/api/confessions/${fixture.id}/poke`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.26' }, body: JSON.stringify({ amount: 10 }) })));
    await Promise.all(pokeResponses.map(r => r.arrayBuffer()));
    assert.ok(pokeResponses.every(r => r.status === 200));
    writes.pokes = { concurrentRequests: 100, expectedIncrement: 1000, actualIncrement: await count() - initial };
    assert.equal(writes.pokes.actualIncrement, 1000);
    const replyCap = 500;
    await fixture.db.query("insert into public.replies(confession_id,song_name,artist_name,spotify_track_id) select $1,'Boundary sample','Sample Artist',$2 from generate_series(1,$3::int)", [fixture.id,fixture.track.id,replyCap-10]);
    const replies = await Promise.all(Array.from({ length: 15 }, (_, i) => fetch(`${fixture.origin}/api/confessions/${fixture.id}/replies`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `203.0.114.${i + 1}` }, body: JSON.stringify({ song: { id: fixture.track.id }, note: `Fictional reply ${i}` }) })));
    await Promise.all(replies.map(r => r.arrayBuffer()));
    writes.replies = { capacity: replyCap, seeded: replyCap - 10, concurrentRequests: 15, accepted: replies.filter(r => r.status === 201).length, full: replies.filter(r => r.status === 409).length };
    assert.equal(writes.replies.accepted, 10); assert.equal(writes.replies.full, 5);
  }
  await fs.writeFile(path.join(output, phase + (interactionsOnly ? '-interactions' : stressOnly ? '-stress' : '') + '.json'), JSON.stringify({ phase, date: new Date().toISOString(), conditions: { browser: await browser.version(), viewport: '390x844', cpuSlowdown: 4, latencyMs: 80, downloadBytesPerSecond: 200000, repeats: 3, rows: 5000, externalResources: 'neutral fixtures, fonts unavailable; font families unchanged', database: 'isolated single-process PGlite; not a production capacity estimate' }, screens: results, interactions, stress, rateLimit, writes }, null, 2) + '\n');
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
  await fixture.close();
}
