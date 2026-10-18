import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SCRUBBER_CONFIG,
  formatPretendTime,
  createParticlePool,
} from "./scrubber-config";

export { SCRUBBER_CONFIG };

export default function MixtapeScrubber({ isMenuOpen = false }) {
  const [progress, setProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isIdle, setIsIdle] = useState(false);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches),
  );
  const [isCoarse, setIsCoarse] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(pointer: coarse)")?.matches),
  );

  const trackRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const rafIdRef = useRef(null);
  const maxScrollRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const lastEmitTimeRef = useRef(0);
  const lastProgressRef = useRef(0);
  const hasCelebratedBottomRef = useRef(false);

  // Idle timers
  const idleTimerRef = useRef(null);
  const idleHeartTimerRef = useRef(null);

  // Pre-allocated particle pool
  const poolRef = useRef(createParticlePool(SCRUBBER_CONFIG.MAX_PARTICLES_DESKTOP));
  const nextParticleIdxRef = useRef(0);
  const colorIdxRef = useRef(0);
  const [activeParticles, setActiveParticles] = useState([]);

  // Detect media query changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarseMq = window.matchMedia("(pointer: coarse)");

    const onMotionChange = (e) => setPrefersReducedMotion(e.matches);
    const onCoarseChange = (e) => setIsCoarse(e.matches);

    motionMq.addEventListener("change", onMotionChange);
    coarseMq.addEventListener("change", onCoarseChange);

    return () => {
      motionMq.removeEventListener("change", onMotionChange);
      coarseMq.removeEventListener("change", onCoarseChange);
    };
  }, []);

  // Detect open dialogs/modals to hide scrubber
  useEffect(() => {
    if (typeof document === "undefined") return;

    const checkModals = () => {
      const activeModal = document.querySelector(
        'dialog[open], [role="dialog"], [aria-modal="true"]',
      );
      setIsModalOpen(Boolean(activeModal));
    };

    checkModals();

    const observer = new MutationObserver(() => {
      checkModals();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "aria-modal"],
    });

    return () => observer.disconnect();
  }, []);

  // Recycle a finished particle back into the pool
  const deactivateParticle = useCallback((id) => {
    const item = poolRef.current[id];
    if (item) {
      item.active = false;
    }
    setActiveParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Spawn a heart particle using the pre-allocated pool
  const spawnHeart = useCallback(
    (xPercent, swayBias = 0) => {
      if (prefersReducedMotion) return;
      const now = Date.now();
      const maxParticles = isCoarse
        ? SCRUBBER_CONFIG.MAX_PARTICLES_MOBILE
        : SCRUBBER_CONFIG.MAX_PARTICLES_DESKTOP;
      const [minDur, maxDur] = SCRUBBER_CONFIG.PARTICLE_LIFETIME_RANGE;
      const [minRise, maxRise] = SCRUBBER_CONFIG.PARTICLE_RISE_RANGE;
      const [minSize, maxSize] = SCRUBBER_CONFIG.PARTICLE_SIZE_RANGE;

      const dur = Math.round(minDur + Math.random() * (maxDur - minDur));
      const rise = Math.round(minRise + Math.random() * (maxRise - minRise));
      const size = Math.round(minSize + Math.random() * (maxSize - minSize));
      const sway = Math.round(Math.random() * 24 - 12 + swayBias);
      const rot = Math.round(Math.random() * 40 - 20);

      const colors = SCRUBBER_CONFIG.COLORS;
      const color = colors[colorIdxRef.current % colors.length];
      colorIdxRef.current = (colorIdxRef.current + 1) % colors.length;

      const pool = poolRef.current;
      const idx = nextParticleIdxRef.current;
      nextParticleIdxRef.current = (nextParticleIdxRef.current + 1) % maxParticles;

      const item = pool[idx];
      item.key = `${idx}-${now}-${Math.random()}`;
      item.active = true;
      item.x = Math.max(0, Math.min(100, xPercent));
      item.size = size;
      item.color = color;
      item.dur = dur;
      item.rise = rise;
      item.sway = sway;
      item.rot = rot;
      item.expiresAt = now + dur;

      setActiveParticles(
        pool.slice(0, maxParticles).filter((p) => p.active && p.expiresAt > now),
      );
    },
    [prefersReducedMotion, isCoarse],
  );

  // Spawn a celebratory burst of hearts around the playhead
  const spawnBurst = useCallback(
    (xPercent) => {
      if (prefersReducedMotion) return;
      const count = SCRUBBER_CONFIG.BURST_COUNT;
      for (let i = 0; i < count; i++) {
        const offsetProgress = xPercent + (Math.random() * 8 - 4);
        spawnHeart(offsetProgress, Math.random() * 20 - 10);
      }
    },
    [prefersReducedMotion, spawnHeart],
  );

  // Visibility logic
  const isHidden = !isScrollable || isModalOpen || isMenuOpen;
  const isExpanded = isHovered || isFocused || isDragging || isScrolling;

  // Reset idle timer on any user activity
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (idleHeartTimerRef.current) clearTimeout(idleHeartTimerRef.current);

    if (typeof document !== "undefined" && document.hidden) return;
    if (isHidden || isExpanded) return;

    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, SCRUBBER_CONFIG.IDLE_DELAY_MS);
  }, [isHidden, isExpanded]);

  // Handle active state changes: schedule idle timer when inactive
  useEffect(() => {
    if (isExpanded || isHidden) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (idleHeartTimerRef.current) clearTimeout(idleHeartTimerRef.current);
    } else {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, SCRUBBER_CONFIG.IDLE_DELAY_MS);
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isExpanded, isHidden]);

  // Derived effective idle flag
  const effectiveIsIdle = isIdle && !isExpanded && !isHidden && !prefersReducedMotion;

  // Handle tab visibility (pause when backgrounded to save CPU/battery)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (idleHeartTimerRef.current) clearTimeout(idleHeartTimerRef.current);
      } else {
        resetIdle();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [resetIdle]);

  // Periodic gentle heart emission during idle
  useEffect(() => {
    if (!effectiveIsIdle) {
      if (idleHeartTimerRef.current) clearTimeout(idleHeartTimerRef.current);
      return;
    }

    const scheduleNextIdleHeart = () => {
      const delay = Math.round(
        SCRUBBER_CONFIG.IDLE_HEART_MIN_MS +
          Math.random() *
            (SCRUBBER_CONFIG.IDLE_HEART_MAX_MS -
              SCRUBBER_CONFIG.IDLE_HEART_MIN_MS),
      );

      idleHeartTimerRef.current = setTimeout(() => {
        if (!document.hidden && !isHidden) {
          spawnHeart(progress, 0);
        }
        scheduleNextIdleHeart();
      }, delay);
    };

    scheduleNextIdleHeart();

    return () => {
      if (idleHeartTimerRef.current) clearTimeout(idleHeartTimerRef.current);
    };
  }, [effectiveIsIdle, isHidden, progress, spawnHeart]);

  // Update scroll bounds and scrollability
  const updateBounds = useCallback(() => {
    if (typeof document === "undefined") return;
    const docEl = document.documentElement;
    const scrollHeight = docEl.scrollHeight;
    const clientHeight = docEl.clientHeight;
    const max = Math.max(0, scrollHeight - clientHeight);
    maxScrollRef.current = max;
    setIsScrollable(max > 20);

    const current = window.scrollY;
    const p = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
    setProgress(p);

    if (!prefersReducedMotion) {
      setRotation((current * 0.4) % 360);
    }
  }, [prefersReducedMotion]);

  // Track scroll position throttled with rAF
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      rafIdRef.current = requestAnimationFrame(() => {
        const max = maxScrollRef.current;
        const current = window.scrollY;
        const p = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
        setProgress(p);

        if (!prefersReducedMotion) {
          setRotation((current * 0.4) % 360);
        }

        const now = performance.now();
        const scrollDelta = Math.abs(current - lastScrollYRef.current);
        const isMoving = scrollDelta >= SCRUBBER_CONFIG.MIN_VELOCITY_PX;
        const canEmit =
          now - lastEmitTimeRef.current >= SCRUBBER_CONFIG.EMIT_INTERVAL_MS;

        // Emit heart trail while moving with velocity
        if (isMoving && canEmit && !prefersReducedMotion) {
          const direction = current >= lastScrollYRef.current ? 1 : -1;
          const swayBias = direction > 0 ? -6 : 6;
          spawnHeart(p, swayBias);
          lastEmitTimeRef.current = now;
        }

        // Bottom of page celebration burst
        const isAtBottom = max > 0 && current >= max - 4;
        if (isAtBottom && !hasCelebratedBottomRef.current && !prefersReducedMotion) {
          hasCelebratedBottomRef.current = true;
          spawnBurst(100);
        } else if (!isAtBottom) {
          hasCelebratedBottomRef.current = false;
        }

        lastScrollYRef.current = current;

        setIsScrolling(true);
        resetIdle();

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 1500);
      });
    };

    const initRaf = requestAnimationFrame(() => {
      updateBounds();
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateBounds, { passive: true });

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateBounds();
      });
      resizeObserver.observe(document.documentElement);
    }

    return () => {
      cancelAnimationFrame(initRaf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateBounds);
      if (resizeObserver) resizeObserver.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (idleHeartTimerRef.current) clearTimeout(idleHeartTimerRef.current);
    };
  }, [updateBounds, prefersReducedMotion, resetIdle, spawnHeart, spawnBurst]);

  // Jump or Drag handler using Pointer Events
  const updateScrollFromPointer = (clientX) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newProgress = (relativeX / rect.width) * 100;
    const max = maxScrollRef.current;
    const targetScroll = (newProgress / 100) * max;

    setProgress(newProgress);
    if (!prefersReducedMotion) {
      setRotation((targetScroll * 0.4) % 360);
    }

    const now = performance.now();
    if (
      now - lastEmitTimeRef.current >= SCRUBBER_CONFIG.EMIT_INTERVAL_MS &&
      !prefersReducedMotion
    ) {
      const direction = newProgress >= lastProgressRef.current ? 1 : -1;
      const swayBias = direction > 0 ? -6 : 6;
      spawnHeart(newProgress, swayBias);
      lastEmitTimeRef.current = now;
    }
    lastProgressRef.current = newProgress;

    window.scrollTo({
      top: targetScroll,
      behavior: isDragging ? "instant" : prefersReducedMotion ? "instant" : "smooth",
    });
    resetIdle();
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateScrollFromPointer(e.clientX);
    resetIdle();
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    updateScrollFromPointer(e.clientX);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if already released
    }
    setIsDragging(false);
    resetIdle();
  };

  // Keyboard navigation on playhead
  const handleKeyDown = (e) => {
    const max = maxScrollRef.current;
    if (max <= 0) return;

    let target = null;
    let swayBias = 0;

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      target = Math.max(0, window.scrollY - 80);
      swayBias = 6;
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      target = Math.min(max, window.scrollY + 80);
      swayBias = -6;
    } else if (e.key === "PageUp") {
      e.preventDefault();
      target = Math.max(0, window.scrollY - window.innerHeight);
      swayBias = 8;
    } else if (e.key === "PageDown") {
      e.preventDefault();
      target = Math.min(max, window.scrollY + window.innerHeight);
      swayBias = -8;
    } else if (e.key === "Home") {
      e.preventDefault();
      target = 0;
      swayBias = 10;
    } else if (e.key === "End") {
      e.preventDefault();
      target = max;
      swayBias = -10;
    }

    if (target !== null) {
      window.scrollTo({
        top: target,
        behavior: prefersReducedMotion ? "instant" : "smooth",
      });
      if (!prefersReducedMotion) {
        spawnHeart(progress, swayBias);
      }
      resetIdle();
    }
  };

  const handleRewind = () => {
    spawnBurst(progress);
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "instant" : "smooth",
    });
    resetIdle();
  };

  return (
    <>
      {/* Hidden reusable SVG heart symbol for particle pool */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <defs>
          <symbol id="scrubber-heart-symbol" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </symbol>
        </defs>
      </svg>

      <aside
        aria-label="Mixtape audio scrubber scroll controller"
        onMouseEnter={() => {
          setIsHovered(true);
          resetIdle();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          resetIdle();
        }}
        onFocus={() => {
          setIsFocused(true);
          resetIdle();
        }}
        onBlur={() => {
          setIsFocused(false);
          resetIdle();
        }}
        style={{
          bottom: "max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
        }}
        className={`fixed left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out ${
          isHidden
            ? "opacity-0 pointer-events-none translate-y-6"
            : isCoarse && !isExpanded
              ? "opacity-70 translate-y-0"
              : "opacity-100 translate-y-0"
        }`}
      >
        <div
          className={`flex items-center gap-2.5 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-full shadow-[3px_3px_0_var(--ink)] transition-all duration-200 ${
            isExpanded
              ? "px-3.5 py-1.5 shadow-[4px_4px_0_var(--ink)] -translate-y-0.5"
              : "px-2.5 py-1"
          } ${effectiveIsIdle ? "scrubber-idle-bob" : ""}`}
        >
          {/* Rewind / Back to top Button */}
          <button
            type="button"
            onClick={handleRewind}
            aria-label="Back to top"
            title="Back to top"
            className="w-11 h-11 flex items-center justify-center shrink-0 rounded-full hover:bg-[var(--butter)] active:scale-95 text-[var(--ink)] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Skip-to-start / Rewind glyph: |<< */}
              <polygon points="19 20 9 12 19 4 19 20" fill="currentColor" />
              <line x1="5" y1="4" x2="5" y2="20" />
            </svg>
          </button>

          {/* Wavy Scrubber Track Container */}
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: "none" }}
            className="relative flex items-center h-8 cursor-pointer w-28 sm:w-44 select-none px-1"
          >
            {/* Heart Particle Layer (aria-hidden, pointer-events-none) */}
            <div
              className="absolute inset-0 pointer-events-none overflow-visible"
              aria-hidden="true"
            >
              {activeParticles.map((p) => (
                <svg
                  key={p.key}
                  className="scrubber-heart-particle"
                  onAnimationEnd={() => deactivateParticle(p.id)}
                  style={{
                    left: `${p.x}%`,
                    top: "50%",
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    color: p.color,
                    "--dur": `${p.dur}ms`,
                    "--rise": `${p.rise}px`,
                    "--sway": `${p.sway}px`,
                    "--rot": `${p.rot}deg`,
                  }}
                >
                  <use href="#scrubber-heart-symbol" fill="currentColor" />
                </svg>
              ))}
            </div>

            {/* Hand-drawn wavy track line (SVG) */}
            <svg
              className="w-full h-4 overflow-visible"
              viewBox="0 0 160 16"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* Unplayed track background */}
              <path
                d="M 0 8 Q 20 2, 40 8 T 80 8 T 120 8 T 160 8"
                fill="none"
                stroke="var(--ink)"
                strokeOpacity="0.25"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                strokeLinecap="round"
              />
              {/* Played track filled with Primary Color */}
              <path
                d="M 0 8 Q 20 2, 40 8 T 80 8 T 120 8 T 160 8"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="165"
                strokeDashoffset={165 - (progress / 100) * 165}
                style={{
                  transition: isDragging ? "none" : "stroke-dashoffset 0.1s linear",
                }}
              />
            </svg>

            {/* Mini Vinyl Playhead Slider */}
            <div
              role="slider"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              aria-label="Page position"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-valuetext={`${Math.round(progress)} percent of the page`}
              style={{
                left: `${progress}%`,
                transform: `translate(-50%, -50%) ${
                  isDragging
                    ? "scale(1.2) rotate(8deg)"
                    : progress <= 0 || progress >= 100
                      ? "scale(1.08)"
                      : "scale(1)"
                }`,
              }}
              className="absolute top-1/2 w-6 h-6 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing rounded-full shadow-[2px_2px_0_var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-transform duration-100 bg-[var(--ink)]"
            >
              {/* Nested Wrapper 1: Soft heartbeat pulse during idle */}
              <div
                className={`w-full h-full flex items-center justify-center ${
                  effectiveIsIdle ? "scrubber-heartbeat" : ""
                }`}
              >
                {/* Nested Wrapper 2: Slow continuous idle vinyl spin */}
                <div
                  className={`w-full h-full flex items-center justify-center ${
                    effectiveIsIdle ? "scrubber-idle-spin" : ""
                  }`}
                  style={{
                    "--idle-spin-sec": `${SCRUBBER_CONFIG.IDLE_SPIN_SECONDS}s`,
                  }}
                >
                  {/* Innermost SVG: Mini Vinyl Disc with scroll-driven rotation */}
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    style={{
                      transform: prefersReducedMotion ? "none" : `rotate(${rotation}deg)`,
                      transition: isDragging ? "none" : "transform 0.05s linear",
                    }}
                    className="w-full h-full"
                    aria-hidden="true"
                  >
                    {/* Outer Vinyl */}
                    <circle
                      cx="12"
                      cy="12"
                      r="11"
                      fill="var(--ink)"
                      stroke="var(--ink)"
                      strokeWidth="1"
                    />
                    {/* Grooves */}
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="0.8"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="5.5"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.8"
                    />
                    {/* Center Record Label */}
                    <circle cx="12" cy="12" r="3.5" fill="var(--butter)" />
                    {/* Center Spindle Hole */}
                    <circle cx="12" cy="12" r="1.2" fill="var(--ink)" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative mini heart sticker pulsing in sync with playhead */}
          <span
            aria-hidden="true"
            className={`inline-flex items-center justify-center text-[var(--coral)] select-none transition-transform duration-300 ${
              effectiveIsIdle
                ? "scrubber-heartbeat scale-110"
                : "opacity-60 scale-90"
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>

          {/* Decorative mm:ss Readout (aria-hidden) */}
          <span
            aria-hidden="true"
            className="font-mono text-[11px] font-bold text-[var(--ink-soft)] shrink-0 w-10 text-center select-none"
          >
            {formatPretendTime(progress)}
          </span>
        </div>
      </aside>
    </>
  );
}
