import React from "react";

/**
 * DSSConfessions Brand Logo System
 *
 * Variants:
 * - "header": Horizontal mark + handwriting wordmark (default, ~30px mark, 28px wordmark)
 * - "footer": Compact horizontal lockup for the footer (~22px mark, 22px wordmark)
 * - "stacked": Vertically stacked mark above wordmark (e.g. About, modals, splash)
 * - "mark-only": Standalone mark icon without text
 *
 * Micro-interaction:
 * - On parent hover or focus, the dashed vinyl groove ring rotates slowly (8s linear)
 *   and the coral heart gives a subtle pulse.
 * - Under prefers-reduced-motion, all animations are completely suppressed.
 */
export function LogoMark({ size = 32, className = "", decorative = true }) {
  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : "DSSConfessions Logo"}
      className={`logo-mark shrink-0 select-none overflow-visible ${className}`}
    >
      {/* Solid Offset Drop Shadow */}
      <path
        d="M 64 16 A 44 44 0 0 1 108 60 A 44 44 0 0 1 64 104 C 57 104 51 101.5 46 98 L 26 112 C 24 113.5 21.5 111.5 22.5 109 C 24 101.5 26.5 94.5 30.5 88 A 44 44 0 0 1 20 60 A 44 44 0 0 1 64 16 Z"
        fill="#1F2A44"
        opacity="0.25"
      />

      {/* Main Speech-Bubble Vinyl Body */}
      <path
        d="M 60 12 A 44 44 0 0 1 104 56 A 44 44 0 0 1 60 100 C 53 100 47 97.5 42 94 L 22 108 C 20 109.5 17.5 107.5 18.5 105 C 20 97.5 22.5 90.5 26.5 84 A 44 44 0 0 1 16 56 A 44 44 0 0 1 60 12 Z"
        fill="#1F2A44"
        stroke="#1F2A44"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Outer Sound Grooves (Dashed for visible spin micro-interaction) */}
      <g className="grooves" style={{ transformOrigin: "60px 56px" }}>
        <circle
          cx="60"
          cy="56"
          r="36"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.32"
          strokeWidth="1.75"
          strokeDasharray="6 4.5"
          strokeLinecap="round"
        />
        <circle
          cx="60"
          cy="56"
          r="27"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.22"
          strokeWidth="1.25"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      </g>

      {/* Subtle Gloss Sheen Arc */}
      <path
        d="M 34 32 A 40 40 0 0 1 88 32"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.18"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Center Record Label (Pastel Pink) */}
      <circle
        cx="60"
        cy="56"
        r="18"
        fill="#FFD9E8"
        stroke="#1F2A44"
        strokeWidth="2"
      />

      {/* Center Heart (Warm Coral) */}
      <path
        className="logo-heart"
        style={{ transformOrigin: "60px 56px", transition: "transform 0.2s ease" }}
        d="M 60 64.5 L 54.8 59.8 C 50.8 56.1 48 53.5 48 50.2 C 48 47.4 50.1 45.2 52.8 45.2 C 54.4 45.2 56 46 57 47.2 L 60 50.4 L 63 47.2 C 64 46 65.6 45.2 67.2 45.2 C 69.9 45.2 72 47.4 72 50.2 C 72 53.5 69.2 56.1 65.2 59.8 L 60 64.5 Z"
        fill="#FF6B6B"
      />

      {/* Tiny White Specular Dot on Heart */}
      <circle cx="53" cy="48" r="1.25" fill="#FFFFFF" />

      {/* Center Spindle Hole */}
      <circle cx="60" cy="56" r="2" fill="#1F2A44" />
    </svg>
  );
}

export default function Logo({
  variant = "header",
  size,
  className = "",
  showTagline = false,
}) {
  if (variant === "mark-only") {
    return <LogoMark size={size || 32} className={className} decorative={false} />;
  }

  if (variant === "stacked") {
    return (
      <div className={`inline-flex flex-col items-center gap-2 text-center group ${className}`}>
        <LogoMark size={size || 56} decorative={true} />
        <div>
          <span className="font-script font-bold text-3xl md:text-4xl text-[var(--ink)] block leading-none">
            dssconfessions
          </span>
          {showTagline && (
            <span className="text-[11px] font-medium text-[var(--primary)] uppercase tracking-wider block mt-1">
              Untold words, sent through the song
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div className={`inline-flex items-center gap-2 group ${className}`}>
        <LogoMark size={size || 24} decorative={true} />
        <span className="font-script font-bold text-2xl text-[var(--ink)] leading-none">
          dssconfessions
        </span>
      </div>
    );
  }

  // Default: "header"
  return (
    <div className={`inline-flex items-center gap-2.5 group ${className}`}>
      <LogoMark size={size || 30} decorative={true} />
      <span className="font-script font-bold text-3xl text-[var(--ink)] leading-none">
        dssconfessions
      </span>
    </div>
  );
}
