import Doodle from "../components/ui/Doodle";
import {
  CANONICAL_DEFINITION,
  DISCLOSURE_SENTENCE,
  DISAMBIGUATION_NOTE,
  OFFICIAL_COLLEGE_NAME,
  OFFICIAL_COLLEGE_URL,
} from "../seo/routes";

export default function DsscLandingView({ setView }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 text-left">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
          <li>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setView("home");
              }}
              className="hover:underline hover:text-[var(--ink)]"
            >
              Home
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-bold text-[var(--ink)]">
            DSSC Confessions
          </li>
        </ol>
      </nav>

      {/* Header & Tag Badge */}
      <header className="mb-8">
        <span className="inline-block bg-[var(--lilac)] text-[var(--ink)] border-2 border-[var(--ink)] rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0_var(--ink)] mb-4">
          DSSC Community Mixtape
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-script font-bold text-[var(--ink)] leading-tight mb-4">
          DSSC Confessions: Send an Anonymous Song to Someone at Davao del Sur State College
        </h1>
        <p className="text-sm sm:text-base font-sans text-[var(--ink-soft)] leading-relaxed">
          Untold thoughts, hidden crushes, and heartfelt dedications across the Digos City and Davao del Sur campus community.
        </p>
      </header>

      {/* Answer Box (40 to 60 words) */}
      <section
        aria-label="Overview Answer Box"
        className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 sm:p-7 shadow-[4px_4px_0_var(--ink)] mb-6 relative overflow-hidden"
      >
        <div className="flex items-start gap-3 mb-3">
          <Doodle kind="note" />
          <h2 className="text-xl font-bold text-[var(--ink)]">
            What is DSSC Confessions?
          </h2>
        </div>
        <p className="text-base sm:text-[17px] font-sans text-[var(--ink)] leading-relaxed mb-4">
          {CANONICAL_DEFINITION}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--ink-soft)]">
          <span className="bg-[var(--sky)] px-2.5 py-0.5 rounded-full border border-[var(--ink)]">
            🎵 Spotify Tracks
          </span>
          <span className="bg-[var(--butter)] px-2.5 py-0.5 rounded-full border border-[var(--ink)]">
            🔒 Zero Accounts
          </span>
          <span className="bg-[var(--mint)]/40 px-2.5 py-0.5 rounded-full border border-[var(--ink)]">
            🛡️ Zero-IP Logging
          </span>
          <span className="bg-[var(--lilac)] px-2.5 py-0.5 rounded-full border border-[var(--ink)]">
            🔑 Delete Keys
          </span>
        </div>
      </section>

      {/* Prominent Non-Affiliation Disclosure & Disambiguation Note */}
      <section
        aria-label="Affiliation Disclosure and Disambiguation"
        className="bg-[var(--butter)]/70 border-2 border-[var(--ink)] rounded-2xl p-5 sm:p-6 shadow-[3px_3px_0_var(--ink)] mb-10"
      >
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-lg" aria-hidden="true">
            ⚠️
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            Independent Student Project Notice
          </h3>
        </div>
        <p className="text-sm font-sans font-bold text-[var(--ink)] mb-3">
          {DISCLOSURE_SENTENCE}
        </p>
        <div className="border-t border-[var(--ink)]/20 pt-3 text-xs sm:text-sm font-sans text-[var(--ink-soft)]">
          <p className="mb-1 font-bold text-[var(--ink)]">
            {DISAMBIGUATION_NOTE}
          </p>
          <p className="leading-relaxed">
            If you are looking for student enrollment, grade inquiries, admission schedules, or the official student portal, please visit the official{" "}
            <a
              href={OFFICIAL_COLLEGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] font-bold underline hover:text-[var(--ink)]"
            >
              {OFFICIAL_COLLEGE_NAME} website ({OFFICIAL_COLLEGE_URL})
            </a>
            . DSSC Confessions does not have access to academic records or enrollment systems.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mb-10">
        <h2 className="text-2xl font-script font-bold text-[var(--ink)] mb-4">
          DSSC Confessions vs. The Official College Portal
        </h2>
        <div className="overflow-x-auto border-2 border-[var(--ink)] rounded-2xl shadow-[3px_3px_0_var(--ink)] bg-[var(--surface)]">
          <table className="w-full text-left text-xs sm:text-sm font-sans">
            <thead className="bg-[var(--bg-wash)] border-b-2 border-[var(--ink)] font-bold text-[var(--ink)]">
              <tr>
                <th scope="col" className="p-3 sm:p-4">Feature</th>
                <th scope="col" className="p-3 sm:p-4 bg-[var(--sky)]/50">DSSC Confessions</th>
                <th scope="col" className="p-3 sm:p-4">Official DSSC Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ink)]/20">
              <tr>
                <td className="p-3 sm:p-4 font-bold text-[var(--ink)]">Purpose</td>
                <td className="p-3 sm:p-4 bg-[var(--sky)]/20">Community song dedications &amp; anonymous thoughts</td>
                <td className="p-3 sm:p-4 text-[var(--ink-soft)]">Official enrollment, student grades &amp; academic records</td>
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-bold text-[var(--ink)]">Account Required</td>
                <td className="p-3 sm:p-4 bg-[var(--sky)]/20 font-bold text-emerald-800">None (100% anonymous)</td>
                <td className="p-3 sm:p-4 text-[var(--ink-soft)]">Official Student ID and password login</td>
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-bold text-[var(--ink)]">Music Integration</td>
                <td className="p-3 sm:p-4 bg-[var(--sky)]/20">Spotify track search and embed playback</td>
                <td className="p-3 sm:p-4 text-[var(--ink-soft)]">None (academic only)</td>
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-bold text-[var(--ink)]">Affiliation</td>
                <td className="p-3 sm:p-4 bg-[var(--sky)]/20 font-bold text-[var(--ink)]">Independent student project</td>
                <td className="p-3 sm:p-4 text-[var(--ink-soft)]">State college administration</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* How to Send a Confession */}
      <section className="mb-10 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 sm:p-8 shadow-[3px_3px_0_var(--ink)]">
        <h2 className="text-2xl font-bold text-[var(--ink)] mb-4">
          How to Send a Confession with a Song
        </h2>
        <p className="text-sm text-[var(--ink-soft)] mb-5">
          Follow these simple steps to dedicate a song to someone at Davao del Sur State College:
        </p>
        <ol className="list-decimal list-inside space-y-3 text-sm text-[var(--ink)]">
          <li>
            <strong>Open the Confess form:</strong> Click the{" "}
            <button
              type="button"
              onClick={() => setView("submit")}
              className="font-bold underline text-[var(--primary)] hover:text-[var(--ink)]"
            >
              Confess button
            </button>{" "}
            in the navigation bar.
          </li>
          <li>
            <strong>Specify the Recipient:</strong> Enter the recipient's name, initials, or familiar nickname (e.g. &ldquo;Sarah M.&rdquo; or &ldquo;To the guy in the library&rdquo;).
          </li>
          <li>
            <strong>Search for your Song:</strong> Type any song title or artist into the Spotify search field and pick the exact track.
          </li>
          <li>
            <strong>Write your Untold Words:</strong> Pour out your message (up to 3,000 characters).
          </li>
          <li>
            <strong>Save your Delete Key:</strong> After posting, save your private 16-character Delete Key. This allows you to permanently remove your confession anytime.
          </li>
        </ol>
      </section>

      {/* How to Find Confessions Written for You */}
      <section className="mb-10 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 sm:p-8 shadow-[3px_3px_0_var(--ink)]">
        <h2 className="text-2xl font-bold text-[var(--ink)] mb-4">
          How to Find Confessions Written for Your Name
        </h2>
        <p className="text-sm text-[var(--ink-soft)] mb-5">
          Wondering if a classmate or secret admirer left a confession for you?
        </p>
        <ol className="list-decimal list-inside space-y-3 text-sm text-[var(--ink)]">
          <li>
            <strong>Navigate to Browse:</strong> Go to the{" "}
            <button
              type="button"
              onClick={() => setView("browse")}
              className="font-bold underline text-[var(--primary)] hover:text-[var(--ink)]"
            >
              Browse page
            </button>
            .
          </li>
          <li>
            <strong>Enter your Name or Nickname:</strong> Type your first name, surname, or campus moniker into the search bar.
          </li>
          <li>
            <strong>Listen to Dedications:</strong> Click any confession card to read the message, view the date, and play the dedicated Spotify song.
          </li>
        </ol>
      </section>

      {/* Safety & Community Rules for the DSSC Community */}
      <section className="mb-10 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 sm:p-8 shadow-[3px_3px_0_var(--ink)]">
        <div className="flex items-center gap-2.5 mb-3">
          <Doodle kind="shield" />
          <h2 className="text-2xl font-bold text-[var(--ink)]">
            Community Rules &amp; Safety
          </h2>
        </div>
        <p className="text-sm text-[var(--ink-soft)] mb-4 leading-relaxed">
          DSSC Confessions is built to be a positive, welcoming space for student expression. To protect all community members across Davao del Sur State College, strict moderation rules apply:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-[var(--ink)]/30 rounded-xl p-4 bg-[var(--coral)]/10">
            <h3 className="font-bold text-sm text-[var(--ink)] mb-2">
              🚫 What is Strictly Prohibited
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[var(--ink-soft)]">
              <li>Bullying, harassment, or targeted personal attacks</li>
              <li>Doxxing (posting contact numbers, private socials, or addresses)</li>
              <li>Hate speech or derogatory remarks</li>
              <li>Naming or referencing minors</li>
              <li>Non-consensual sexual content or explicit threats</li>
            </ul>
          </div>
          <div className="border border-[var(--ink)]/30 rounded-xl p-4 bg-[var(--mint)]/20">
            <h3 className="font-bold text-sm text-[var(--ink)] mb-2">
              🛡️ Moderation &amp; Removal Tools
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[var(--ink-soft)]">
              <li>
                <strong>Report Button:</strong> Click the flag icon on any confession to report violating content.
              </li>
              <li>
                <strong>Immediate Hiding:</strong> Reports indicating urgent harm automatically hide the post from public view.
              </li>
              <li>
                <strong>Author Deletion:</strong> Authors can instantly erase their confession using their private Delete Key.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* What Data is Stored */}
      <section className="mb-10 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 sm:p-8 shadow-[3px_3px_0_var(--ink)]">
        <h2 className="text-2xl font-bold text-[var(--ink)] mb-3">
          What Data is Stored?
        </h2>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-3">
          We maintain an absolute zero-IP policy. We never log client IP addresses, browser fingerprints, or GPS locations. Rate limiting uses transient cryptographic hashes with daily salts that expire automatically.
        </p>
        <p className="text-sm font-bold text-[var(--ink)]">
          Read our complete technical guarantees on the{" "}
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              setView("privacy");
            }}
            className="text-[var(--primary)] underline hover:text-[var(--ink)]"
          >
            Privacy Policy page
          </a>
          .
        </p>
      </section>

      {/* Who Made It */}
      <section className="mb-10 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 sm:p-8 shadow-[3px_3px_0_var(--ink)]">
        <h2 className="text-2xl font-bold text-[var(--ink)] mb-3">
          Who Created DSSC Confessions?
        </h2>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-3">
          DSSC Confessions was developed by Joshua &ldquo;Snowi&rdquo; Cambronero as an independent community project. Inspired by musical expression platforms, it was designed to give students in Digos City and Davao del Sur a safe and musical way to share unspoken thoughts.
        </p>
        <p className="text-xs text-[var(--ink-soft)]">
          {/* TODO(owner): confirm that I am a DSSC student before stating it */}
          Independent developer project • Built with React, Express, Supabase &amp; Spotify Web API.
        </p>
      </section>

      {/* Related Questions (linking to /faq anchors) */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[var(--ink)] mb-4">
          Related Questions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <a
            href="/faq#is-it-anonymous"
            onClick={(e) => {
              e.preventDefault();
              setView("faq");
              window.location.hash = "is-it-anonymous";
            }}
            className="p-3 bg-[var(--surface)] border border-[var(--ink)] rounded-xl hover:bg-[var(--butter)] font-bold text-[var(--ink)] transition-colors"
          >
            → Is it really anonymous?
          </a>
          <a
            href="/faq#how-to-delete-confession"
            onClick={(e) => {
              e.preventDefault();
              setView("faq");
              window.location.hash = "how-to-delete-confession";
            }}
            className="p-3 bg-[var(--surface)] border border-[var(--ink)] rounded-xl hover:bg-[var(--butter)] font-bold text-[var(--ink)] transition-colors"
          >
            → How does the Delete Key work?
          </a>
          <a
            href="/faq#what-are-pokes"
            onClick={(e) => {
              e.preventDefault();
              setView("faq");
              window.location.hash = "what-are-pokes";
            }}
            className="p-3 bg-[var(--surface)] border border-[var(--ink)] rounded-xl hover:bg-[var(--butter)] font-bold text-[var(--ink)] transition-colors"
          >
            → What are Pokes on confessions?
          </a>
          <a
            href="/faq#how-to-report-confession"
            onClick={(e) => {
              e.preventDefault();
              setView("faq");
              window.location.hash = "how-to-report-confession";
            }}
            className="p-3 bg-[var(--surface)] border border-[var(--ink)] rounded-xl hover:bg-[var(--butter)] font-bold text-[var(--ink)] transition-colors"
          >
            → How do I report a confession about me?
          </a>
        </div>
      </section>

      {/* Primary CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-4 py-6 border-t-2 border-dashed border-[var(--ink)]/30">
        <button
          type="button"
          onClick={() => setView("submit")}
          className="btn btn-primary px-8 py-3.5 font-bold text-sm shadow-[3px_3px_0_var(--ink)] cursor-pointer"
        >
          Tell Your Story
        </button>
        <button
          type="button"
          onClick={() => setView("browse")}
          className="btn btn-paper px-8 py-3.5 font-bold text-sm shadow-[3px_3px_0_var(--ink)] cursor-pointer"
        >
          Browse Confessions
        </button>
      </div>
    </div>
  );
}

