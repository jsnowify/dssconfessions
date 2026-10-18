import { useState, useEffect } from "react";
import Doodle from "../components/ui/Doodle";
import { CANONICAL_DEFINITION } from "../seo/routes";

const FAQ_ITEMS = [
  {
    id: "what-is-dssconfessions",
    question: "What is dssconfessions?",
    answer: CANONICAL_DEFINITION,
    extra:
      "Unlike traditional social media confession pages that rely on Google Forms or Facebook posts, DSSConfessions integrates directly with Spotify to attach music to your words, generates one-time author deletion keys, and maintains strict zero-IP logging.",
  },
  {
    id: "is-it-anonymous",
    question: "Is it really anonymous and what data is stored?",
    answer:
      "Yes, DSSConfessions is genuinely anonymous. We do not require accounts, usernames, emails, or phone numbers. We never store raw IP addresses, location data, or device fingerprints in our database. All rate limiting uses transient, daily-salted cryptographic hashes.",
    extra:
      "When you post, we only store the recipient name, optional sender pseudonym, message text, and verified Spotify track details. No identifiers tying the post to your network or identity exist.",
  },
  {
    id: "do-i-need-an-account",
    question: "Do I need an account to post or browse?",
    answer:
      "No account is ever needed. Anyone can visit the site, search for confessions by recipient name, listen to the attached music, or post their own confession without signing up or logging in.",
  },
  {
    id: "is-it-free",
    question: "Is dssconfessions free to use?",
    answer:
      "Yes, DSSConfessions is 100% free with no paywalls, premium tiers, or hidden subscriptions. It is a passion project built to give people a creative, music-driven way to share their feelings.",
  },
  {
    id: "how-to-send-a-confession",
    question: "How do I send a confession with a song?",
    answer:
      "Go to the Confess page, enter the recipient's name, type your message, search for your chosen song on Spotify, and tap Post Confession. You will immediately receive a private one-time Delete Key that lets you delete the confession whenever you want.",
    steps: [
      "Open the Confess page from the navigation bar.",
      "Enter the recipient's name (e.g., their first name or nickname).",
      "Write your message (up to 3,000 characters).",
      "Search Spotify for the song that captures your feelings and select it.",
      "Review the Live Preview and tap Post Confession.",
      "Save your private Delete Key safely.",
    ],
  },
  {
    id: "how-to-find-confessions",
    question: "How do I find confessions written for my name?",
    answer:
      "Visit the Browse page and type your name, nickname, or initials into the search bar. DSSConfessions will find all public confessions dedicated to that recipient, with matching songs and timestamps.",
  },
  {
    id: "how-to-delete-confession",
    question: "How do I delete my confession after posting?",
    answer:
      "Every author receives a unique Delete Key upon submission. When viewing your confession card, click the trash or options icon, enter your Delete Key, and confirm. The confession is permanently deleted from our database with zero retention.",
    extra:
      "Please keep your Delete Key safe. Because we do not store emails or accounts, a lost Delete Key cannot be recovered automatically.",
  },
  {
    id: "how-to-report-confession",
    question: "How do I report a confession or request removal of something about me?",
    answer:
      "Click the flag icon on any confession card and select 'This is about me and I want it removed' or another applicable reason. Confessions that receive verified community reports or urgent flags are immediately hidden from the public feed.",
  },
  {
    id: "what-are-pokes",
    question: "What are Pokes on confessions?",
    answer:
      "A Poke is a lightweight, friendly 'I saw this' interaction. Tapping the Poke button increments the public count and sends an anonymous nudge letting the author know their story was noticed. Pokes never reveal who poked.",
  },
  {
    id: "where-do-songs-come-from",
    question: "Where do the songs come from?",
    answer:
      "Songs are sourced in real time from the Spotify Web API. When you select a song, we verify its track ID and embed the official Spotify player so listeners can hear the full audio directly on Spotify.",
  },
  {
    id: "what-content-is-prohibited",
    question: "What content is not allowed on DSSConfessions?",
    answer:
      "We strictly prohibit harassment, hate speech, bullying, doxxing (posting phone numbers, addresses, or private personal data), threats of violence, non-consensual sexual content, and spam. Violating posts are removed promptly.",
  },
  {
    id: "who-made-dssconfessions",
    question: "Who made dssconfessions and why?",
    answer:
      "DSSConfessions was created by Joshua as an independent community project inspired by music sharing and platform experiments like SendTheSong. It was built to create a safe, warm space for unspoken thoughts paired with art.",
  },
];

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
            el.scrollIntoView({ behavior: "smooth", block: "start" });
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
        <span className="inline-block bg-[var(--butter)] text-[var(--ink)] border-2 border-[var(--ink)] rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0_var(--ink)] mb-4">
          Answers & Safety
        </span>
        <h1 className="text-5xl md:text-6xl font-script font-bold text-[var(--ink)] mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-[var(--ink-soft)] text-base max-w-xl mx-auto">
          Everything you need to know about anonymity, songs, deletion keys, and
          how DSSConfessions keeps you safe.
        </p>
        <p className="font-mono text-xs text-[var(--ink-soft)] mt-3">
          Last updated: October 18, 2026
        </p>
      </div>

      {/* Comparison Table */}
      <section className="mb-14 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[4px_4px_0_var(--ink)]">
        <div className="flex items-center gap-3 mb-4">
          <Doodle kind="note" />
          <h2 className="text-2xl font-bold text-[var(--ink)]">
            How DSSConfessions Compares
          </h2>
        </div>
        <p className="text-sm text-[var(--ink-soft)] mb-6">
          An honest breakdown of how DSSConfessions differs from traditional
          confession pages and social media boards.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--ink)] font-mono text-xs uppercase tracking-wider text-[var(--ink)]">
                <th className="py-3 px-3">Feature</th>
                <th className="py-3 px-3 text-[var(--primary)] font-bold">
                  DSSConfessions
                </th>
                <th className="py-3 px-3 text-[var(--ink-soft)]">
                  Traditional Pages / Forms
                </th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-[var(--ink)]/20">
              <tr>
                <td className="py-3 px-3 font-bold">Account Required</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">
                  No (Never)
                </td>
                <td className="py-3 px-3 text-[var(--ink-soft)]">
                  Often Google / FB login
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">IP Address Logging</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">
                  Zero (Daily HMAC salt)
                </td>
                <td className="py-3 px-3 text-[var(--ink-soft)]">
                  Commonly tracked / logged
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Spotify Music Attached</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">
                  Yes (Full Spotify integration)
                </td>
                <td className="py-3 px-3 text-[var(--ink-soft)]">Text only</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Author Deletion Key</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">
                  Yes (Instant self-removal)
                </td>
                <td className="py-3 px-3 text-[var(--ink-soft)]">
                  Must message admin / wait
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Recipient Search</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">
                  Yes (Search by name)
                </td>
                <td className="py-3 px-3 text-[var(--ink-soft)]">
                  Endless scroll feed
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Community Pokes</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">
                  Yes (One-tap nudges)
                </td>
                <td className="py-3 px-3 text-[var(--ink-soft)]">None</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold">Cost</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">
                  100% Free
                </td>
                <td className="py-3 px-3 text-[var(--ink-soft)]">Free</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Dropdown / Accordion Section */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-soft)]">
            {FAQ_ITEMS.length} Questions
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--ink)] hover:text-[var(--primary)] underline cursor-pointer"
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
                className={`bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl shadow-[3px_3px_0_var(--ink)] transition-all overflow-hidden scroll-mt-28 ${
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
                  className="w-full flex items-center justify-between text-left p-5 md:p-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] gap-4 transition-colors hover:bg-[var(--bg-wash)]/60"
                >
                  <h2 className="text-lg md:text-xl font-bold text-[var(--ink)] leading-snug">
                    {item.question}
                  </h2>
                  <span
                    className={`shrink-0 w-8 h-8 rounded-full border-2 border-[var(--ink)] flex items-center justify-center transition-transform duration-200 ${
                      isOpen
                        ? "bg-[var(--butter)] rotate-180"
                        : "bg-[var(--surface)]"
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

                {isOpen && (
                  <div
                    id={`faq-panel-${item.id}`}
                    role="region"
                    aria-labelledby={`faq-btn-${item.id}`}
                    className="px-5 pb-6 md:px-6 md:pb-6 pt-2 border-t border-[var(--ink)]/15 text-[var(--ink)] animate-fade-in"
                  >
                    <p className="text-sm md:text-base leading-relaxed font-medium mb-2">
                      {item.answer}
                    </p>
                    {item.extra && (
                      <p className="text-[var(--ink-soft)] text-sm leading-relaxed mt-2">
                        {item.extra}
                      </p>
                    )}
                    {item.steps && (
                      <ol className="mt-3 list-decimal list-inside space-y-1.5 text-sm text-[var(--ink)]">
                        {item.steps.map((step, idx) => (
                          <li key={idx} className="font-medium">
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Helpful Links Callout */}
      <section className="bg-[var(--bg-wash)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 text-center shadow-[4px_4px_0_var(--ink)]">
        <h3 className="text-2xl font-bold text-[var(--ink)] mb-2">
          Ready to share your story?
        </h3>
        <p className="text-sm text-[var(--ink-soft)] mb-6 max-w-md mx-auto">
          It only takes a minute to attach a soundtrack and send your untold
          words anonymously.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setView("submit")}
            className="btn btn-ink px-6 py-3 font-bold text-sm uppercase tracking-wider cursor-pointer"
          >
            Write a Confession
          </button>
          <button
            type="button"
            onClick={() => setView("browse")}
            className="btn btn-paper px-6 py-3 font-bold text-sm uppercase tracking-wider cursor-pointer"
          >
            Search Your Name
          </button>
        </div>
      </section>
    </div>
  );
}
