const { test } = require("node:test");
const assert = require("node:assert/strict");

test("Mixtape Scrubber unit & integration suite", async (t) => {
  // Dynamically load the ESM scrubber-config module
  const {
    SCRUBBER_CONFIG,
    formatPretendTime,
    calculateReadingTimeSeconds,
    createParticlePool,
    shouldEmitHeart,
  } = await import("../../client/src/components/ui/scrubber-config.js");

  await t.test("SCRUBBER_CONFIG parameters match architectural requirements", () => {
    assert.equal(SCRUBBER_CONFIG.IDLE_DELAY_MS, 1200);
    assert.equal(SCRUBBER_CONFIG.IDLE_SPIN_SECONDS, 9);
    assert.equal(SCRUBBER_CONFIG.IDLE_HEART_MIN_MS, 3000);
    assert.equal(SCRUBBER_CONFIG.IDLE_HEART_MAX_MS, 6000);
    assert.equal(SCRUBBER_CONFIG.MAX_PARTICLES_DESKTOP, 24);
    assert.equal(SCRUBBER_CONFIG.MAX_PARTICLES_MOBILE, 14);
    assert.equal(SCRUBBER_CONFIG.EMIT_INTERVAL_MS, 60);
    assert.equal(SCRUBBER_CONFIG.MIN_VELOCITY_PX, 3);
    assert.equal(SCRUBBER_CONFIG.BURST_COUNT, 8);
    assert.deepEqual(SCRUBBER_CONFIG.PARTICLE_LIFETIME_RANGE, [700, 1100]);
    assert.deepEqual(SCRUBBER_CONFIG.PARTICLE_RISE_RANGE, [24, 56]);
    assert.deepEqual(SCRUBBER_CONFIG.PARTICLE_SIZE_RANGE, [8, 16]);
    assert.ok(Array.isArray(SCRUBBER_CONFIG.COLORS));
    assert.ok(SCRUBBER_CONFIG.COLORS.length >= 4);
  });

  await t.test("formatPretendTime formats playback duration accurately", () => {
    assert.equal(formatPretendTime(0), "00:00");
    assert.equal(formatPretendTime(50), "01:45");
    assert.equal(formatPretendTime(100), "03:30");
    // Boundary conditions
    assert.equal(formatPretendTime(-10), "00:00");
    assert.equal(formatPretendTime(150), "03:30");

    // Dynamic total duration support
    assert.equal(formatPretendTime(0, 120), "00:00");
    assert.equal(formatPretendTime(50, 120), "01:00");
    assert.equal(formatPretendTime(100, 120), "02:00");
  });

  await t.test("calculateReadingTimeSeconds computes page-specific duration from text and elements", () => {
    // 200 words at 200 WPM = 60 seconds
    const sample200 = "word ".repeat(200);
    assert.equal(calculateReadingTimeSeconds(sample200), 60);

    // 400 words at 200 WPM = 120 seconds
    const sample400 = "word ".repeat(400);
    assert.equal(calculateReadingTimeSeconds(sample400), 120);

    // Empty fallback
    assert.equal(calculateReadingTimeSeconds(""), 60);
    assert.equal(calculateReadingTimeSeconds(null), 60);
  });

  await t.test("createParticlePool pre-allocates exact slot count without runtime leaks", () => {
    const desktopPool = createParticlePool(SCRUBBER_CONFIG.MAX_PARTICLES_DESKTOP);
    assert.equal(desktopPool.length, 24);
    assert.equal(desktopPool.every((p) => p.active === false), true);
    assert.equal(desktopPool.every((p) => typeof p.id === "number"), true);

    const mobilePool = createParticlePool(SCRUBBER_CONFIG.MAX_PARTICLES_MOBILE);
    assert.equal(mobilePool.length, 14);
    assert.equal(mobilePool.every((p) => p.active === false), true);
  });

  await t.test("shouldEmitHeart respects minimum velocity and throttle interval", () => {
    // 1. Stationary or sub-threshold jitter (< 3px): NEVER emit
    assert.equal(shouldEmitHeart(0, 16, 100), false);
    assert.equal(shouldEmitHeart(1, 16, 100), false);
    assert.equal(shouldEmitHeart(2, 16, 100), false);
    assert.equal(shouldEmitHeart(-2.5, 16, 100), false);

    // 2. High velocity but throttled (< 60ms elapsed): DO NOT emit
    assert.equal(shouldEmitHeart(20, 16, 20), false);
    assert.equal(shouldEmitHeart(50, 16, 59), false);

    // 3. High velocity AND throttle elapsed (>= 60ms): EMIT
    assert.equal(shouldEmitHeart(3, 16, 60), true);
    assert.equal(shouldEmitHeart(-15, 16, 75), true);
    assert.equal(shouldEmitHeart(100, 16, 150), true);
  });

  await t.test("Particle pool recycling simulation enforces hard caps on desktop and mobile", () => {
    // Simulate desktop emission loop with 100 continuous scrolls
    const desktopCap = SCRUBBER_CONFIG.MAX_PARTICLES_DESKTOP; // 24
    const pool = createParticlePool(desktopCap);
    let nextIdx = 0;

    for (let i = 0; i < 100; i++) {
      const idx = nextIdx;
      nextIdx = (nextIdx + 1) % desktopCap;
      pool[idx].active = true;
      pool[idx].x = (i * 5) % 100;
    }

    const activeCount = pool.filter((p) => p.active).length;
    assert.ok(activeCount <= desktopCap, `Expected <= ${desktopCap}, got ${activeCount}`);
    assert.equal(pool.length, 24, "Pool array size must never grow beyond pre-allocated cap");

    // Simulate mobile emission loop
    const mobileCap = SCRUBBER_CONFIG.MAX_PARTICLES_MOBILE; // 14
    const mobilePool = createParticlePool(mobileCap);
    let mobileNextIdx = 0;

    for (let i = 0; i < 100; i++) {
      const idx = mobileNextIdx;
      mobileNextIdx = (mobileNextIdx + 1) % mobileCap;
      mobilePool[idx].active = true;
    }

    const mobileActiveCount = mobilePool.filter((p) => p.active).length;
    assert.ok(mobileActiveCount <= mobileCap, `Expected <= ${mobileCap}, got ${mobileActiveCount}`);
    assert.equal(mobilePool.length, 14, "Mobile pool array size must never grow beyond cap");
  });

  await t.test("Idle timer simulation resets on active user interaction", async () => {
    let isIdle = false;
    let timer = null;

    const resetIdle = () => {
      isIdle = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        isIdle = true;
      }, 50); // fast test timeout
    };

    resetIdle();
    assert.equal(isIdle, false);

    // Activity arrives at 25ms (before 50ms timeout)
    await new Promise((r) => setTimeout(r, 25));
    resetIdle();
    assert.equal(isIdle, false);

    // Another activity at 25ms
    await new Promise((r) => setTimeout(r, 25));
    resetIdle();
    assert.equal(isIdle, false);

    // Now wait 60ms without activity -> enters idle
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(isIdle, true);

    if (timer) clearTimeout(timer);
  });
});

