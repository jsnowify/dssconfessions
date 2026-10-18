import React, { useState, useEffect, useRef } from "react";

const PAGES = [
  { id: "home", label: "Home" },
  { id: "browse", label: "Browse" },
  { id: "confess", label: "Confess" },
  { id: "about", label: "About" },
];

export default function DesignArchiveLightbox({
  isOpen,
  onClose,
  versions = [],
  activeVersionId = "v1",
  initialPage = "home",
  initialDevice = "desktop",
}) {
  const [versionId, setVersionId] = useState(activeVersionId);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [device, setDevice] = useState(initialDevice);
  const [isLoaded, setIsLoaded] = useState(false);

  const dialogRef = useRef(null);
  const triggerRef = useRef(
    typeof document !== "undefined" ? document.activeElement : null,
  );

  // Find active version object
  const currentVersionIndex = versions.findIndex((v) => v.id === versionId);
  const currentVersion = versions[currentVersionIndex] || versions[0] || null;

  // Find current image in version
  const activeImage = currentVersion?.images?.find(
    (img) => img.page === currentPage && img.device === device,
  ) || currentVersion?.images?.[0] || null;

  // Preload neighboring images for seamless switching
  useEffect(() => {
    if (!currentVersion || !isOpen) return;
    const preloadList = currentVersion.images?.filter(
      (img) => img.page !== currentPage || img.device !== device,
    ) || [];
    for (const item of preloadList.slice(0, 3)) {
      const img = new Image();
      img.src = item.full;
    }
  }, [currentVersion, currentPage, device, isOpen]);

  // Focus trap & keyboard navigation (Esc, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowLeft") {
        // Prev page or prev version
        e.preventDefault();
        const pageIdx = PAGES.findIndex((p) => p.id === currentPage);
        if (pageIdx > 0) {
          setCurrentPage(PAGES[pageIdx - 1].id);
        } else if (currentVersionIndex > 0) {
          setVersionId(versions[currentVersionIndex - 1].id);
          setCurrentPage(PAGES[PAGES.length - 1].id);
        }
        return;
      }

      if (e.key === "ArrowRight") {
        // Next page or next version
        e.preventDefault();
        const pageIdx = PAGES.findIndex((p) => p.id === currentPage);
        if (pageIdx < PAGES.length - 1) {
          setCurrentPage(PAGES[pageIdx + 1].id);
        } else if (currentVersionIndex < versions.length - 1) {
          setVersionId(versions[currentVersionIndex + 1].id);
          setCurrentPage(PAGES[0].id);
        }
        return;
      }

      // Tab trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Initial focus on close button or container
    const timer = setTimeout(() => {
      const closeBtn = dialogRef.current?.querySelector(".lightbox-close-btn");
      closeBtn?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose, currentPage, currentVersionIndex, versions]);

  // Restore focus to trigger on close
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [isOpen]);

  // Modal background scroll locking
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, [isOpen]);

  if (!isOpen || !currentVersion) return null;

  const hasPrev = currentVersionIndex > 0;
  const hasNext = currentVersionIndex < versions.length - 1;

  const handlePrevVersion = () => {
    if (hasPrev) {
      setVersionId(versions[currentVersionIndex - 1].id);
      setIsLoaded(false);
    }
  };

  const handleNextVersion = () => {
    if (hasNext) {
      setVersionId(versions[currentVersionIndex + 1].id);
      setIsLoaded(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${currentVersion.name} screenshot viewer`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[var(--ink)]/80 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Screen reader live announcement */}
      <span className="sr-only" aria-live="polite">
        {`Viewing ${currentVersion.name}, ${currentPage} page on ${device}.`}
      </span>

      <div
        ref={dialogRef}
        className="relative w-full max-w-5xl bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl shadow-[6px_6px_0_var(--ink)] flex flex-col max-h-[92vh] overflow-hidden no-scrollbar"
      >
        {/* Lightbox Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b-2 border-[var(--ink)] bg-[var(--bg-wash)]">
          {/* Title & Version Badge */}
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 font-mono text-xs font-bold bg-[var(--primary)] text-white rounded-full">
              {currentVersion.id.toUpperCase()}
            </span>
            <div>
              <h3 className="font-script font-bold text-2xl text-[var(--ink)] leading-none">
                {currentVersion.name}
              </h3>
              <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                {currentVersion.period}
              </span>
            </div>
          </div>

          {/* Controls: Pages, Devices & Close */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Page Switcher Tabs */}
            <div className="flex items-center bg-[var(--surface)] border border-[var(--ink)] rounded-full p-0.5">
              {PAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCurrentPage(p.id);
                    setIsLoaded(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full transition-colors cursor-pointer ${
                    currentPage === p.id
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Device Toggle (Desktop / Mobile) */}
            <div className="flex items-center bg-[var(--surface)] border border-[var(--ink)] rounded-full p-0.5">
              <button
                type="button"
                onClick={() => {
                  setDevice("desktop");
                  setIsLoaded(false);
                }}
                title="Desktop viewport (1440x900)"
                aria-label="Desktop viewport"
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full transition-colors cursor-pointer ${
                  device === "desktop"
                    ? "bg-[var(--butter)] text-[var(--ink)]"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => {
                  setDevice("mobile");
                  setIsLoaded(false);
                }}
                title="Mobile viewport (390x844)"
                aria-label="Mobile viewport"
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full transition-colors cursor-pointer ${
                  device === "mobile"
                    ? "bg-[var(--butter)] text-[var(--ink)]"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                Mobile
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close lightbox"
              className="lightbox-close-btn w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface)] border-2 border-[var(--ink)] hover:bg-[var(--coral)] hover:text-white transition-colors cursor-pointer font-bold text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lightbox Main Stage */}
        <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 bg-[var(--bg)] min-h-[360px] max-h-[68vh] overflow-auto no-scrollbar">
          {/* Previous Version Button */}
          {hasPrev && (
            <button
              type="button"
              onClick={handlePrevVersion}
              aria-label={`Previous version: ${versions[currentVersionIndex - 1]?.name}`}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[var(--surface)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--butter)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              ←
            </button>
          )}

          {/* Next Version Button */}
          {hasNext && (
            <button
              type="button"
              onClick={handleNextVersion}
              aria-label={`Next version: ${versions[currentVersionIndex + 1]?.name}`}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[var(--surface)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--butter)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              →
            </button>
          )}

          {/* Screenshot Display */}
          {activeImage ? (
            <div
              className={`transition-opacity duration-300 ${
                isLoaded ? "opacity-100" : "opacity-40"
              } ${
                device === "mobile"
                  ? "max-w-[320px] sm:max-w-[360px] border-4 border-[var(--ink)] rounded-3xl shadow-[5px_5px_0_var(--ink)] overflow-hidden bg-black"
                  : "w-full max-w-4xl border-2 border-[var(--ink)] rounded-xl shadow-[4px_4px_0_var(--ink)] overflow-hidden bg-[var(--surface)]"
              }`}
            >
              <img
                src={activeImage.full}
                alt={activeImage.alt}
                width={activeImage.width}
                height={activeImage.height}
                onLoad={() => setIsLoaded(true)}
                className="w-full h-auto object-contain block select-none"
              />
            </div>
          ) : (
            <div className="p-8 text-center font-mono text-sm text-[var(--ink-soft)]">
              No screenshot available for this view.
            </div>
          )}
        </div>

        {/* Lightbox Footer Caption */}
        <div className="p-3 sm:p-4 border-t-2 border-[var(--ink)] bg-[var(--surface)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[var(--ink-soft)]">
          <p className="max-w-xl text-left">
            <strong className="text-[var(--ink)]">{currentVersion.name}:</strong>{" "}
            {currentVersion.summary}
          </p>
          <div className="text-[11px] text-[var(--ink-soft)] text-right">
            <span>Use Left/Right arrows to flip • Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
