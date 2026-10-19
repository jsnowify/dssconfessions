import { useState, useEffect } from "react";
import Doodle from "../components/ui/Doodle";
import {
  CANONICAL_DEFINITION,
  DISCLOSURE_SENTENCE,
  OFFICIAL_COLLEGE_NAME,
  OFFICIAL_COLLEGE_URL,
} from "../seo/routes";

const FAQ_ITEMS = [
  {
    id: "what-is-dssconfessions",
    question: "What is DSSC Confessions?",
    answer: CANONICAL_DEFINITION,
    extra:
      "Unlike traditional social media confession pages that rely on Google Forms or Facebook posts, DSSC Confessions integrates directly with Spotify to attach music to your words, generates one-time author deletion keys, and maintains strict zero-IP logging.",
  },
  {
    id: "is-dssc-confessions-official",
    question: "Is DSSC Confessions the official DSSC website or student portal?",
    answer:
      "No. DSSC Confessions is an independent, student-made creative website. It is not the official website, student portal, or grading system of Davao del Sur State College. For official enrollment and records, visit the official college site.",
    extra: `If you are looking for the official college administration, please visit ${OFFICIAL_COLLEGE_URL}.`,
  },
  {
    id: "is-dssc-affiliated",
    question: "Is DSSC Confessions affiliated with Davao del Sur State College?",
    answer:
      "No. DSSC Confessions is not affiliated with, sponsored by, or endorsed by Davao del Sur State College. The college name is used purely descriptively to identify the student and campus community we serve.",
    extra: DISCLOSURE_SENTENCE,
  },
  {
    id: "where-to-find-official-dssc",
    question: "Where can I find the official DSSC website or student portal?",
    answer:
      "The official website of Davao del Sur State College is at https://www.dssc.edu.ph/. For student and employee portal services (enrollment, grades, records), access the official DSSC Portal directly at https://portal.dssc.edu.ph/.",
  },
  {
    id: "who-can-send-confession",
    question: "Who can send a confession?",
    answer:
      "Anyone in the Davao del Sur State College community—students, alumni, faculty, and friends across Digos City and Davao del Sur—can send an anonymous confession. No account, student ID, or login is required.",
  },
  {
    id: "is-it-anonymous",
    question: "Is DSSC Confessions safe and anonymous?",
    answer:
      "Yes. We require no accounts, email addresses, or phone numbers. We never log raw IP addresses or device fingerprints. Abuse-prevention safeguards operate without storing or logging your personal identity.",
    extra:
      "When you post, we only store the recipient name, optional sender pseudonym, message text, and verified Spotify track details. No identifiers tying the post to your network or identity exist.",
  },
  {
    id: "how-to-report-confession",
    question: "How do I report or remove a confession about me?",
    answer:
      "Click the flag icon on any confession card and choose 'This is about me and I want it removed' or another reason. Confessions receiving verified urgent reports are hidden automatically from public view.",
  },
  {
    id: "how-to-delete-confession",
    question: "How do I delete a confession I posted?",
    answer:
      "When you submit a confession, you receive a private one-time Delete Key. Enter this key on your confession card at any time to permanently remove it from our database.",
    extra:
      "Please keep your Delete Key safe. Because we do not store emails or accounts, a lost Delete Key cannot be recovered automatically.",
  },
  {
    id: "who-made-dssconfessions",
    question: "Who runs DSSC Confessions?",
    answer:
      "DSSC Confessions was built by Joshua as an independent community project to give the Davao del Sur State College student community a warm, creative, music-driven space for unspoken thoughts.",
  },
  {
    id: "what-are-pokes",
    question: "What are Pokes on confessions?",
    answer:
      "A Poke is a lightweight, friendly tap on a confession. Tapping Poke increments the counter to let the author know someone read their story, with zero user tracking.",
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
      "Visit the Browse page and type your name, nickname, or initials into the search bar. DSSC Confessions will find all public confessions dedicated to that recipient, with matching songs and timestamps.",
  },
  {
    id: "how-many-song-replies",
    question: "How many song replies can a confession receive?",
    answer:
      "Each confession can receive up to 500 anonymous song replies on its mixtape. The author can turn off replies when posting, or use their private Delete Key to remove individual replies and free up spots.",
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

                {isOpen && (
                  <div
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
                )}
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
          <button
            type="button"
            onClick={() => setView("dssc-landing")}
            className="btn btn-paper px-6 py-3 font-bold text-sm uppercase tracking-wider cursor-pointer"
          >
            DSSC Community Info
          </button>
        </div>
      </section>
    </div>
  );
}
