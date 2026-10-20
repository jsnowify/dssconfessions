import PageLink from "../components/ui/PageLink";
import { useState, useEffect } from "react";
import Doodle from "../components/ui/Doodle";
import {
  OFFICIAL_COLLEGE_NAME,
  OFFICIAL_COLLEGE_URL,
} from "../seo/routes";
import { FAQ_ITEMS } from "../content/faq";

export default function FaqView({ setView }) {
  const [openItems, setOpenItems] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashId = window.location.hash.replace(/^#/, "");
      if (FAQ_ITEMS.some((item) => item.id === hashId)) {
        return new Set([hashId]);
      }
    }
    // Default: first FAQ open as a visual cue that items drop down
    return new Set(["what-is-dssconfessions"]);
  });

  // Handle direct hash navigation
  useEffect(() => {
    const handleHash = () => {
      if (typeof window === "undefined" || !window.location.hash) return;
      const hashId = window.location.hash.replace(/^#/, "");
      if (FAQ_ITEMS.some((item) => item.id === hashId)) {
        setOpenItems((prev) => new Set([...prev, hashId]));
        requestAnimationFrame(() => {
          const el = document.getElementById(hashId);
          if (el) {
            el.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
                block: "start",
              });
          }
        });
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const toggleItem = (id) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allOpen = openItems.size === FAQ_ITEMS.length;
  const toggleAll = () => {
    if (allOpen) {
      setOpenItems(new Set());
    } else {
      setOpenItems(new Set(FAQ_ITEMS.map((item) => item.id)));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-block bg-(--butter) text-(--ink) border-2 border-(--ink) rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0_var(--ink)] mb-4">
          Answers &amp; Safety
        </span>
        <h1 className="text-5xl md:text-6xl font-script font-bold text-(--ink) mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-(--ink-soft) text-base max-w-xl mx-auto">
          Everything you need to know about anonymity, songs, deletion keys, and
          how DSSC Confessions keeps you safe in the Davao del Sur State College community.
        </p>
        <p className="text-xs text-(--ink-soft) mt-3">
          Last updated: October 18, 2026
        </p>
      </div>

      {/* Comparison: DSSC Confessions vs Official College Portal */}
      <section className="mb-14 bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[4px_4px_0_var(--ink)] text-left">
        <div className="flex items-center gap-3 mb-4">
          <Doodle kind="note" />
          <h2 className="text-2xl font-bold text-(--ink)">
            DSSC Confessions vs. The Official DSSC Website/Portal
          </h2>
        </div>
        <p className="text-sm text-(--ink-soft) mb-6">
          An honest, neutral distinction between our independent student creative board and the official state college administration.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-(--ink) text-xs font-bold uppercase tracking-wider text-(--ink)">
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-(--primary) font-bold">
                  DSSC Confessions
                </th>
                <th className="py-3 px-3 text-(--ink-soft)">
                  Official DSSC Website / Portal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-(--ink)/20">
              <tr>
                <td className="py-3 px-3 font-bold">Purpose</td>
                <td className="py-3 px-3 text-emerald-700 font-bold">
                  Community song dedications &amp; anonymous thoughts
                </td>
                <td className="py-3 px-3 text-(--ink-soft)">
                  Official enrollment, grades, transcripts &amp; admissions
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Accounts &amp; Login</td>
                <td className="py-3 px-3 text-emerald-700 font-bold">
                  None needed (100% anonymous)
                </td>
                <td className="py-3 px-3 text-(--ink-soft)">
                  Official student/faculty portal credentials
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Music Pairing</td>
                <td className="py-3 px-3 text-emerald-700 font-bold">
                  Spotify track integration
                </td>
                <td className="py-3 px-3 text-(--ink-soft)">None (academic records only)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Affiliation</td>
                <td className="py-3 px-3 text-emerald-700 font-bold">
                  Independent student-built project
                </td>
                <td className="py-3 px-3 text-(--ink-soft)">
                  Official Davao del Sur State College administration
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Dropdown / Accordion Section */}
      <section className="mb-16 text-left">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-(--ink-soft)">
            {FAQ_ITEMS.length} Questions
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-bold uppercase tracking-wider text-(--ink) hover:text-(--primary) underline cursor-pointer"
          >
            {allOpen ? "Collapse All ↑" : "Expand All ↓"}
          </button>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openItems.has(item.id);
            return (
              <article
                key={item.id}
                id={item.id}
                className={`bg-(--surface) border-2 border-(--ink) rounded-2xl shadow-[3px_3px_0_var(--ink)] transition-all overflow-hidden scroll-mt-28 ${
                  isOpen
                    ? "shadow-[4px_4px_0_var(--ink)]"
                    : "hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--ink)]"
                }`}
              >
                <button
                  type="button"
                  id={`faq-btn-${item.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center justify-between text-left p-5 md:p-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary) gap-4 transition-colors hover:bg-(--bg-wash)/60"
                >
                  <h2 className="text-lg md:text-xl font-bold text-(--ink) leading-snug">
                    {item.question}
                  </h2>
                  <span
                    className={`shrink-0 w-8 h-8 rounded-full border-2 border-(--ink) flex items-center justify-center transition-transform duration-200 ${
                      isOpen
                        ? "bg-(--butter) rotate-180"
                        : "bg-(--surface)"
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                <div
                  hidden={!isOpen}
                  id={`faq-panel-${item.id}`}
                  role="region"
                  aria-labelledby={`faq-btn-${item.id}`}
                  className="px-5 pb-6 md:px-6 md:pb-6 pt-2 border-t border-(--ink)/15 text-(--ink) animate-fade-in long-form"
                >
                  <p className="text-sm md:text-base leading-relaxed font-medium mb-2">
                    {item.answer}
                  </p>
                  {item.extra && (
                    <p className="text-(--ink-soft) text-sm leading-relaxed mt-2">
                      {item.extra}
                    </p>
                  )}
                  {item.steps && (
                    <ol className="mt-3 list-decimal list-inside space-y-1.5 text-sm text-(--ink)">
                      {item.steps.map((step, idx) => (
                        <li key={idx} className="font-medium">
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Helpful Links Callout */}
      <section className="bg-(--bg-wash) border-2 border-(--ink) rounded-2xl p-6 md:p-8 text-center shadow-[4px_4px_0_var(--ink)]">
        <h3 className="text-2xl font-bold text-(--ink) mb-2">
          Ready to share your story?
        </h3>
        <p className="text-sm text-(--ink-soft) mb-6 max-w-md mx-auto">
          It only takes a minute to attach a soundtrack and send your untold
          words anonymously to someone at DSSC.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <PageLink href="/confess" view="submit" setView={setView} className="btn btn-ink px-6 py-3 font-bold text-sm uppercase tracking-wider cursor-pointer">
            Write a Confession
          </PageLink>
          <PageLink href="/browse" view="browse" setView={setView} className="btn btn-paper px-6 py-3 font-bold text-sm uppercase tracking-wider cursor-pointer">
            Search Your Name
          </PageLink>
          <PageLink href="/dssc-confessions" view="dssc-landing" setView={setView} className="btn btn-paper px-6 py-3 font-bold text-sm uppercase tracking-wider cursor-pointer">
            DSSC Community Info
          </PageLink>
        </div>
      </section>
    </div>
  );
}
