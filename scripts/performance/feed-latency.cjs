// Local-only benchmark: fictional data, no .env, no hosted API requests.
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { setTimeout: delay } = require('node:timers/promises');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { startFixture } = require('./fixture.cjs');

function withRoundTrip(database, milliseconds) {
  const wrap = query => new Proxy(query, {
    get(target, key) {
      if (key === 'then') return (resolve, reject) => delay(milliseconds).then(() => target).then(resolve, reject);
      const value = target[key];
      return typeof value === 'function' ? (...args) => wrap(value.apply(target, args)) : value;
    },
  });
  return {
    from: table => wrap(database.from(table)),
    rpc: async (...args) => { await delay(milliseconds); return database.rpc(...args); },
  };
}

async function main() {
  const label = process.argv[2];
  assert.ok(['before', 'after'].includes(label), 'Usage: node scripts/performance/feed-latency.cjs before|after');
  const measurements = [];
  for (const roundTripMs of [0, 20]) {
    const fixture = await startFixture({
      decorateDatabase: database => roundTripMs ? withRoundTrip(database, roundTripMs) : database,
    });
    try {
      let client = 0;
      const request = async () => {
        const start = performance.now();
        const response = await fetch(fixture.origin + '/api/confessions', {
          headers: { 'x-forwarded-for': `192.0.2.${++client}` },
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).length, 20);
        return performance.now() - start;
      };
      for (let i = 0; i < 5; i++) await request();
      const callStart = fixture.calls.length;
      const times = [];
      for (let i = 0; i < 30; i++) times.push(await request());
      times.sort((a, b) => a - b);
      measurements.push({ simulatedDatabaseRoundTripMs: roundTripMs, requests: times.length,
        p50Ms: +times[14].toFixed(2), p95Ms: +times[28].toFixed(2),
        databaseCallsPerRequest: (fixture.calls.length - callStart) / times.length });
    } finally { await fixture.close(); }
  }
  const result = { label, date: new Date().toISOString(), conditions: 'Warm local Express, 5000 fictional confessions, isolated PGlite; optional 20 ms delay per database call is simulated, not production latency', measurements };
  const output = resolve(__dirname, '../../performance-results');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, `feed-${label}.json`), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
