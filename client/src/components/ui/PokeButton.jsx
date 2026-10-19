import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

/**
 * Formats poke count: full number up to 9,999, abbreviated above (12.4k, 1.2M).
 */
function formatCount(num) {
  const n = Number(num) || 0;
  if (n <= 9999) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
}

export default function PokeButton({
  confessionId,
  initialCount = 0,
  isPreview = false,
  onToast,
}) {
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [comboBubble, setComboBubble] = useState(null); // { amount, id }
  const [announcement, setAnnouncement] = useState("");

  const pendingTapsRef = useRef(0);
  const comboTapsRef = useRef(0);
  const batchTimerRef = useRef(null);
  const comboResetTimerRef = useRef(null);
  const animationTimerRef = useRef(null);
  const bubbleTimerRef = useRef(null);
  const bubbleIdRef = useRef(0);

  // Synchronize with external count changes
  useEffect(() => {
    setCount((prev) => {
      const serverNum = Number(initialCount) || 0;
      // If we have pending local taps, retain optimistic addition over server base
      return Math.max(serverNum + pendingTapsRef.current, prev);
    });
  }, [initialCount]);

  // Clean up legacy per-day localStorage keys on mount
  useEffect(() => {
    try {
      if (typeof localStorage === "undefined") return;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("poked:")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage blocked or unavailable; fail-soft
    }
  }, []);

  // Flush pending taps to the server
  const flushBatch = useCallback(async () => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    const amountToSend = pendingTapsRef.current;
    if (amountToSend <= 0 || !confessionId || isPreview) return;

    // Reset pending batch counter
    pendingTapsRef.current = 0;

    try {
      const response = await axios.post(
        `/api/confessions/${confessionId}/poke`,
        { amount: amountToSend },
      );

      if (typeof response.data?.count === "number") {
        const serverCount = response.data.count;
        // Reconcile with any new taps added while this request was in flight
        setCount(serverCount + pendingTapsRef.current);
        setAnnouncement(
          `Poked ${amountToSend} time${amountToSend === 1 ? "" : "s"}. ${serverCount} total pokes.`,
        );
      }
    } catch (err) {
      // Roll back ONLY the failed batch amount
      setCount((prev) => Math.max(0, prev - amountToSend));
      setAnnouncement("Failed to deliver pokes.");

      // BUG-006 standard error extraction
      const serverMsg =
        err.response?.data?.error ||
        "Could not send poke. Please try again shortly.";
      if (typeof onToast === "function") {
        onToast(serverMsg);
      }
    }
  }, [confessionId, isPreview, onToast]);

  // Flush on tab hide or page close with keepalive
  useEffect(() => {
    if (isPreview || !confessionId) return;

    const flushOnExit = () => {
      const amount = pendingTapsRef.current;
      if (amount <= 0) return;
      pendingTapsRef.current = 0;

      const url = `/api/confessions/${confessionId}/poke`;
      const payload = JSON.stringify({ amount });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushOnExit();
      }
    };

    window.addEventListener("pagehide", flushOnExit);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushOnExit);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Flush any leftover taps on unmount
      flushOnExit();
    };
  }, [confessionId, isPreview]);

  // Preview state: non-interactive pill with count 0
  if (isPreview) {
    return (
      <span
        className="poke-btn opacity-60 cursor-default select-none"
        aria-hidden="true"
        title="Poke preview"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
        <span>Poke 0</span>
      </span>
    );
  }

  const handlePoke = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confessionId) return;

    // 1. Optimistic UI update: count +1 instantly
    setCount((prev) => prev + 1);
    pendingTapsRef.current += 1;
    comboTapsRef.current += 1;

    // 2. Snappy "boop" button wiggle
    setIsAnimating(true);
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    animationTimerRef.current = setTimeout(() => setIsAnimating(false), 300);

    // 3. Floating combo bubble (+1 or +combo when tapping fast)
    bubbleIdRef.current += 1;
    setComboBubble({
      amount: comboTapsRef.current,
      id: bubbleIdRef.current,
    });
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => {
      setComboBubble(null);
    }, 600);

    // Reset combo counter if user stops tapping for 600ms
    if (comboResetTimerRef.current) clearTimeout(comboResetTimerRef.current);
    comboResetTimerRef.current = setTimeout(() => {
      comboTapsRef.current = 0;
    }, 600);

    // 4. Batch burst: schedule flush after 400ms idle, or immediately if reaching 100 taps
    if (pendingTapsRef.current >= 100) {
      flushBatch();
    } else {
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(flushBatch, 400);
    }
  };

  const label = `Poke this confession. ${count} poke${count === 1 ? "" : "s"} so far.`;

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handlePoke}
        aria-label={label}
        className={`poke-btn ${isAnimating ? "poke-btn--animating" : ""}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
        <span>Poke</span>
        {count > 0 && (
          <span className="text-[10px] font-semibold ml-0.5">
            {formatCount(count)}
          </span>
        )}
      </button>

      {comboBubble && (
        <span
          key={comboBubble.id}
          className="poke-plus-one"
          aria-hidden="true"
        >
          +{comboBubble.amount}
        </span>
      )}

      {/* Accessible live region announces once per batch */}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
