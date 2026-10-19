import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "reader-font";
const EVENT_NAME = "dss:reader-font-change";

export function getInitialReaderFont() {
  if (typeof window === "undefined") return "hand";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "hand" || saved === "inter") {
      return saved;
    }
    // High contrast preference default
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-contrast: more)").matches
    ) {
      return "inter";
    }
  } catch {
    // LocalStorage blocked (private browsing / disabled)
  }
  return "hand";
}

export function applyReaderFontToDocument(font) {
  if (typeof document === "undefined") return;
  const target = font === "inter" ? "inter" : "hand";
  document.documentElement.setAttribute("data-reader-font", target);
}

export function useReaderFont() {
  const [readerFont, setReaderFontState] = useState(getInitialReaderFont);

  // Apply to document immediately on mount or state change
  useEffect(() => {
    applyReaderFontToDocument(readerFont);
  }, [readerFont]);

  // Synchronize across multiple hook instances and tabs
  useEffect(() => {
    const handleCustomChange = (event) => {
      const next = event.detail;
      if (next === "hand" || next === "inter") {
        setReaderFontState(next);
        applyReaderFontToDocument(next);
      }
    };

    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY) {
        const next = event.newValue;
        if (next === "hand" || next === "inter") {
          setReaderFontState(next);
          applyReaderFontToDocument(next);
        }
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setReaderFont = useCallback((nextFont) => {
    const val = nextFont === "inter" ? "inter" : "hand";
    setReaderFontState(val);
    applyReaderFontToDocument(val);

    try {
      localStorage.setItem(STORAGE_KEY, val);
    } catch {
      // Ignore private mode write failures
    }

    // Broadcast to other components in the current tab
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: val }));
  }, []);

  return [readerFont, setReaderFont];
}

