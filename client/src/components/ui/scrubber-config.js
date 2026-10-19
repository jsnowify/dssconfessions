/**
 * Configuration and helpers for MixtapeScrubber:
 * - Idle animations (bob, slow vinyl spin, heartbeat pulse)
 * - Heart particle trail (emission rates, velocity thresholds, pooling limits)
 */

export const SCRUBBER_CONFIG = {
  // Idle timers
  IDLE_DELAY_MS: 1200,
  IDLE_SPIN_SECONDS: 9,
  IDLE_HEART_MIN_MS: 3000,
  IDLE_HEART_MAX_MS: 6000,

  // Particle pool limits
  MAX_PARTICLES_DESKTOP: 24,
  MAX_PARTICLES_MOBILE: 14,
  EMIT_INTERVAL_MS: 60,
  MIN_VELOCITY_PX: 3,

  // Particle dynamics
  PARTICLE_LIFETIME_RANGE: [700, 1100],
  PARTICLE_RISE_RANGE: [24, 56],
  PARTICLE_SIZE_RANGE: [8, 16],
  BURST_COUNT: 8,

  // Design tokens palette for hearts
  COLORS: [
    "var(--coral)",
    "var(--pink)",
    "var(--lilac)",
    "var(--primary)",
  ],
};

/**
 * Format pretend audio playback time (e.g., total 03:30 or dynamic page duration).
 */
export function formatPretendTime(progressPercent, totalSeconds = 210) {
  const duration = Math.max(1, totalSeconds);
  const currentSeconds = Math.min(
    duration,
    Math.max(0, Math.round((progressPercent / 100) * duration)),
  );
  const mins = String(Math.floor(currentSeconds / 60)).padStart(2, "0");
  const secs = String(currentSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

/**
 * Calculate estimated reading time in seconds based only on active page content.
 * Uses average adult reading speed of ~200 WPM with sensible bounds.
 */
export function calculateReadingTimeSeconds(textOrElement, wordsPerMinute = 200) {
  let text = "";
  if (typeof textOrElement === "string") {
    text = textOrElement;
  } else if (textOrElement && typeof textOrElement === "object") {
    try {
      const clone = textOrElement.cloneNode(true);
      const toRemove = clone.querySelectorAll(
        "script, style, svg, [aria-hidden='true'], dialog, [role='dialog'], .modal-backdrop, aside"
      );
      toRemove.forEach((el) => el.remove());
      text = clone.innerText || clone.textContent || "";
    } catch {
      text = textOrElement.textContent || "";
    }
  }

  const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  if (words <= 0) return 60; // 1 min fallback for empty/skeleton states

  const rawSeconds = Math.round((words / wordsPerMinute) * 60);
  return Math.max(30, rawSeconds);
}

/**
 * Pre-allocate a fixed pool of particle slots to eliminate per-frame allocations during scrolling.
 */
export function createParticlePool(size = SCRUBBER_CONFIG.MAX_PARTICLES_DESKTOP) {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    key: `p-${i}`,
    active: false,
    x: 0,
    size: 10,
    color: SCRUBBER_CONFIG.COLORS[0],
    dur: 900,
    rise: 36,
    sway: 0,
    rot: 0,
    expiresAt: 0,
  }));
}

/**
 * Determines whether scroll movement exceeds the minimum threshold to emit a particle.
 */
export function shouldEmitHeart(scrollDelta, timeDeltaMs, lastEmitElapsedMs) {
  if (lastEmitElapsedMs < SCRUBBER_CONFIG.EMIT_INTERVAL_MS) {
    return false;
  }
  return Math.abs(scrollDelta) >= SCRUBBER_CONFIG.MIN_VELOCITY_PX;
}

