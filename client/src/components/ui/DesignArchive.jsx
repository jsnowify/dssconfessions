import React, { useState, useRef, useEffect } from "react";
import archiveData from "../../content/design-archive.json";
import DesignArchiveLightbox from "./DesignArchiveLightbox";

export default function DesignArchive() {
  const [isOpen, setIsOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState("v1");
  const [selectedPage, setSelectedPage] = useState("home");
  const [selectedDevice, setSelectedDevice] = useState("desktop");

  const panelRef = useRef(null);

  // Scroll disclosure panel into view when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

      panelRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? "instant" : "smooth",
        block: "start",
      });
    }
  }, [isOpen]);

  const openLightbox = (versionId, page = "home", device = "desktop") => {
    setSelectedVersionId(versionId);
    setSelectedPage(page);
    setSelectedDevice(device);
    setLightboxOpen(true);
  };

  const { intro, disclaimer, versions = [] } = archiveData;

  return (
    <section
      aria-label="Design Archive section"
      className="w-full border-t border-[var(--ink)]/20 pt-8 mt-4"
    >
      {/* Collapsed State Control / Teaser Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3 text-left">
          <span
            className="w-8 h-8 rounded-full bg-[var(--butter)] border border-[var(--ink)] flex items-center justify-center shrink-0 text-sm shadow-[1px_1px_0_var(--ink)]"
            aria-hidden="true"
          >
            📼
          </span>
          <div>
            <h4 className="font-script font-bold text-xl text-[var(--ink)] leading-tight">
              Design archive
            </h4>
            <p className="text-[11px] font-mono text-[var(--ink-soft)] normal-case">
              See how this site has evolved over time • Practice in creativity
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls="design-archive-panel"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] text-xs font-mono font-bold text-[var(--ink)] hover:bg-[var(--butter)] active:scale-95 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Layers / Rewind frames icon */}
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          {isOpen ? "Hide older designs" : "Older designs"}
          <span className="text-[10px] ml-0.5" aria-hidden="true">
            {isOpen ? "▲" : "▼"}
          </span>
        </button>
      </div>

      {/* Expanded Disclosure Panel */}
      {isOpen && (
        <div
          id="design-archive-panel"
          ref={panelRef}
          className="mt-6 pt-6 border-t-2 border-dashed border-[var(--ink)]/30 text-left transition-all duration-300"
        >
          {/* Section Heading & Intro */}
          <div className="max-w-2xl mb-8">
            <span className="inline-block px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider bg-[var(--lilac)] border border-[var(--ink)] rounded-full shadow-[2px_2px_0_var(--ink)] mb-3 text-[var(--ink)]">
              CREATIVE JOURNEY
            </span>
            <h3 className="font-script font-bold text-3xl sm:text-4xl text-[var(--ink)] mb-3">
              Why I keep older designs here
            </h3>
            <p className="text-xs sm:text-sm font-sans leading-relaxed text-[var(--ink)]">
              {intro}
            </p>
          </div>

          {/* Timeline of Version Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {versions.map((ver) => {
              const homeDesktop = ver.images?.find(
                (i) => i.page === "home" && i.device === "desktop",
              );
              const homeMobile = ver.images?.find(
                (i) => i.page === "home" && i.device === "mobile",
              );

              return (
                <div
                  key={ver.id}
                  className={`relative flex flex-col justify-between p-5 rounded-2xl border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition-transform hover:-translate-y-1 ${
                    ver.current
                      ? "bg-[var(--sky)]/50 ring-2 ring-[var(--primary)]"
                      : "bg-[var(--surface)]"
                  }`}
                >
                  <div>
                    {/* Header: Version badge + Period */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border border-[var(--ink)] shadow-[1px_1px_0_var(--ink)] ${
                          ver.current
                            ? "bg-[var(--primary)] text-white"
                            : "bg-[var(--butter)] text-[var(--ink)]"
                        }`}
                      >
                        {ver.id.toUpperCase()}
                      </span>
                      {ver.current && (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-[var(--coral)] text-white">
                          NOW
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-[var(--ink-soft)] ml-auto">
                        {ver.period}
                      </span>
                    </div>

                    <h4 className="font-script font-bold text-2xl text-[var(--ink)] mb-1">
                      {ver.name}
                    </h4>
                    <p className="font-sans text-xs text-[var(--ink-soft)] leading-relaxed mb-4">
                      {ver.summary}
                    </p>

                    {/* Screenshot Preview with Phone Overlay */}
                    {homeDesktop && (
                      <div
                        onClick={() => openLightbox(ver.id, "home", "desktop")}
                        className="relative w-full rounded-xl border-2 border-[var(--ink)] overflow-hidden bg-black/5 cursor-pointer group mb-4 shadow-[2px_2px_0_var(--ink)]"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openLightbox(ver.id, "home", "desktop");
                          }
                        }}
                        aria-label={`View full screenshots for ${ver.name}`}
                      >
                        {/* Desktop Thumbnail */}
                        <img
                          src={homeDesktop.thumb}
                          alt={homeDesktop.alt}
                          width={homeDesktop.width}
                          height={homeDesktop.height}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-cover block transition-transform group-hover:scale-102"
                        />

                        {/* Mini Phone Frame Overlay */}
                        {homeMobile && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              openLightbox(ver.id, "home", "mobile");
                            }}
                            className="absolute bottom-2 right-2 w-14 sm:w-16 border-2 border-[var(--ink)] rounded-md overflow-hidden shadow-[2px_2px_0_var(--ink)] bg-black transition-transform group-hover:scale-105"
                            title="View mobile version"
                          >
                            <img
                              src={homeMobile.thumb}
                              alt={homeMobile.alt}
                              width={homeMobile.width}
                              height={homeMobile.height}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-auto object-cover block"
                            />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-[var(--ink)]/0 group-hover:bg-[var(--ink)]/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface)] text-[var(--ink)] text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
                            🔍 Inspect
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Collapsible What I Learned List */}
                    {ver.learned?.length > 0 && (
                      <details className="mt-2 text-xs font-sans text-[var(--ink-soft)] group/details">
                        <summary className="font-mono text-[11px] font-bold text-[var(--ink)] cursor-pointer select-none hover:text-[var(--primary)] list-none flex items-center justify-between">
                          <span>💡 What I learned</span>
                          <span className="text-[10px] transition-transform group-open/details:rotate-180">
                            ▼
                          </span>
                        </summary>
                        <ul className="mt-2 space-y-1.5 pl-3 border-l-2 border-[var(--primary)]/40 text-[11px] leading-relaxed">
                          {ver.learned.map((item, lIdx) => (
                            <li key={lIdx}>{item}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  {/* Card Action */}
                  <div className="mt-4 pt-3 border-t border-[var(--ink)]/15 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openLightbox(ver.id, "home", "desktop")}
                      className="text-xs font-mono font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Browse screenshots →
                    </button>
                    {ver.current && (
                      <a
                        href="/"
                        className="text-[11px] font-mono text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      >
                        (Current Site)
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy & Neutral Placeholder Disclosure */}
          <div className="p-3 bg-[var(--surface)] border border-[var(--ink)]/40 rounded-xl text-[11px] font-mono text-[var(--ink-soft)] flex items-center gap-2">
            <span aria-hidden="true">🛡️</span>
            <span>{disclaimer}</span>
          </div>
        </div>
      )}

      {/* Lightbox Dialog */}
      {lightboxOpen && (
        <DesignArchiveLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          versions={versions}
          activeVersionId={selectedVersionId}
          initialPage={selectedPage}
          initialDevice={selectedDevice}
        />
      )}
    </section>
  );
}
