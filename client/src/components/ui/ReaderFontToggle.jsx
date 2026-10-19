import React, { useRef, useState, useId } from "react";
import { useReaderFont } from "../../hooks/useReaderFont";

export default function ReaderFontToggle({
  variant = "list",
  className = "",
}) {
  const [readerFont, setReaderFont] = useReaderFont();
  const [announcement, setAnnouncement] = useState("");
  const handRadioRef = useRef(null);
  const interRadioRef = useRef(null);
  const generatedId = useId();
  const helperId = `reader-toggle-desc-${generatedId.replace(/:/g, "")}`;

  const isHand = readerFont === "hand";
  const isInter = readerFont === "inter";

  const handleSelect = (mode) => {
    if (mode === readerFont) return;

    // 1. Scroll anchoring: record top-most visible confession card before font change
    let anchorEl = null;
    let anchorTop = 0;
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const candidates = document.querySelectorAll(
        ".record-card, .confession-card, .details-view, .detail-card-wrap, .preview-panel, .pinboard > *"
      );
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > 80 && rect.top < window.innerHeight) {
          anchorEl = el;
          anchorTop = rect.top;
          break;
        }
      }
    }

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 2. Cross-fade text
    if (!isReducedMotion && typeof document !== "undefined") {
      document.documentElement.classList.add("font-switching");
    }

    // 3. Switch font
    setReaderFont(mode);
    setAnnouncement(
      mode === "inter" ? "Easy-read font on" : "Handwriting font on"
    );

    // 4. Scroll anchoring correction
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        if (anchorEl) {
          const newRect = anchorEl.getBoundingClientRect();
          const delta = newRect.top - anchorTop;
          if (Math.abs(delta) > 1) {
            window.scrollBy({ top: delta, behavior: "instant" });
          }
        }
        if (!isReducedMotion && typeof document !== "undefined") {
          setTimeout(() => {
            document.documentElement.classList.remove("font-switching");
          }, 120);
        }
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      handleSelect("inter");
      interRadioRef.current?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      handleSelect("hand");
      handRadioRef.current?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      handleSelect("hand");
      handRadioRef.current?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      handleSelect("inter");
      interRadioRef.current?.focus();
    }
  };

  return (
    <div
      className={`reader-toggle-wrap ${className}`}
      title="Switches confession text to Inter for easier reading."
    >
      {/* Hidden live region for screen-reader announcements */}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {/* Accessible description for aria-describedby */}
      <span id={helperId} className="sr-only">
        Switches confession text to Inter for easier reading.
      </span>

      <div
        role="radiogroup"
        aria-label="Confession text style"
        aria-describedby={helperId}
        onKeyDown={handleKeyDown}
        data-active={readerFont}
        className={`reader-toggle reader-toggle--${variant}`}
      >
        {/* Sliding selection thumb */}
        <div className="reader-toggle__thumb" aria-hidden="true" />

        {/* Option 1: Handwriting */}
        <button
          ref={handRadioRef}
          type="button"
          role="radio"
          aria-checked={isHand}
          tabIndex={isHand ? 0 : -1}
          onClick={() => handleSelect("hand")}
          className={`reader-toggle__option ${isHand ? "reader-toggle__option--active" : ""}`}
        >
          <span
            className="reader-toggle__glyph font-handwritten"
            aria-hidden="true"
          >
            Aa
          </span>
          <span className="reader-toggle__label reader-toggle__label--hand">
            Handwriting
          </span>
        </button>

        {/* Option 2: Easy read */}
        <button
          ref={interRadioRef}
          type="button"
          role="radio"
          aria-checked={isInter}
          tabIndex={isInter ? 0 : -1}
          onClick={() => handleSelect("inter")}
          className={`reader-toggle__option ${isInter ? "reader-toggle__option--active" : ""}`}
        >
          <span
            className="reader-toggle__glyph font-sans"
            aria-hidden="true"
          >
            Aa
          </span>
          <span className="reader-toggle__label reader-toggle__label--inter">
            Easy read
          </span>
        </button>
      </div>
    </div>
  );
}
