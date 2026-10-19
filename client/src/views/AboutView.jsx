import Doodle from "../components/ui/Doodle";

const AboutView = () => (
  <div className="liner-notes max-w-5xl mx-auto px-6 animate-fade-in pt-12 pb-24 about-bento">
    {/* Heading */}
    <h1 className="text-5xl md:text-6xl about-title font-script text-center font-bold mb-8">
      About DSSC Confessions
    </h1>

    {/* Section 1: The Creator */}
    <section className="sleeve-panel about-tile about-tile--creator p-7 md:p-8">
      <span className="liner-tag font-bold">CREDITS</span>
      <h2 className="text-xl md:text-2xl font-bold uppercase mb-3 tracking-tight text-[var(--ink)]">
        The Creator
      </h2>
      <p className="text-[var(--ink-soft)] text-[16px] md:text-[17px] font-normal leading-relaxed">
        Hi, I'm{" "}
        <a
          href="https://snowi-swjc.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--ink)] font-bold underline hover:text-[var(--accent)] hover:decoration-[var(--accent)] "
        >
          Joshua "Snowi" Cambronero
        </a>
        , a 4th-year BSIT student. I built this for fun and to practice software
        engineering craft with real community vibes for the Davao del Sur State College community.
      </p>
    </section>

    {/* Section 2: Key Facts & Entity Disclosures (Semantic <dl>) */}
    <section className="sleeve-panel about-tile p-7 md:p-8 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl shadow-[4px_4px_0_var(--ink)]">
      <span className="liner-tag font-bold">COMMUNITY CONTEXT</span>
      <h2 className="text-xl md:text-2xl font-bold uppercase mb-4 tracking-tight text-[var(--ink)]">
        Key Facts
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-sans">
        <div className="p-3 bg-[var(--sky)]/30 rounded-xl border border-[var(--ink)]/20">
          <dt className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] mb-1">
            Audience &amp; Region
          </dt>
          <dd className="text-[var(--ink-soft)] leading-relaxed">
            The student, alumni, and campus community of Davao del Sur State College (DSSC), located in Digos City, Davao del Sur, Philippines.
          </dd>
        </div>
        <div className="p-3 bg-[var(--butter)]/40 rounded-xl border border-[var(--ink)]/20">
          <dt className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] mb-1">
            Affiliation Status
          </dt>
          <dd className="text-[var(--ink-soft)] leading-relaxed">
            Independent student project. Not affiliated with, sponsored by, or endorsed by Davao del Sur State College.
          </dd>
        </div>
        <div className="p-3 bg-[var(--mint)]/30 rounded-xl border border-[var(--ink)]/20">
          <dt className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] mb-1">
            Service Model
          </dt>
          <dd className="text-[var(--ink-soft)] leading-relaxed">
            100% free anonymous message board paired with verified Spotify tracks. Zero accounts, zero ads, and zero IP address logging.
          </dd>
        </div>
        <div className="p-3 bg-[var(--lilac)]/30 rounded-xl border border-[var(--ink)]/20">
          <dt className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] mb-1">
            DSSC Community Hub
          </dt>
          <dd className="text-[var(--ink-soft)] leading-relaxed">
            Read our dedicated{" "}
            <a
              href="/dssc-confessions"
              className="font-bold underline text-[var(--primary)] hover:text-[var(--ink)]"
            >
              DSSC Confessions overview
            </a>{" "}
            for submission steps, safety rules, and official portal disambiguation.
          </dd>
        </div>
      </dl>
    </section>

    {/* Section 3: Inspiration */}
    <section className="sleeve-panel about-tile about-tile--inspiration p-7 md:p-8">
      <span className="liner-tag font-bold">LINER NOTES</span>
      <h2 className="text-xl md:text-2xl font-bold uppercase mb-3 tracking-tight text-[var(--ink)]">
        Inspiration
      </h2>
      <p className="text-[var(--ink-soft)] text-[16px] md:text-[17px] font-normal leading-relaxed">
        People often leave things unsaid. This project gives those words a safe
        place to live, paired with the exact songs that carry them. It's
        inspired by{" "}
        <a
          href="https://sendthesong.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--ink)] font-bold underline hover:text-[var(--accent)] hover:decoration-[var(--accent)] "
        >
          SendTheSong
        </a>
        .
      </p>
    </section>

    {/* Section 4: Privacy Guarantee */}
    <section className="sleeve-panel about-tile about-tile--privacy p-7 md:p-8 relative">
      <Doodle kind="shield" className="privacy-doodle" />
      <span className="liner-tag font-bold">THE FINE PRINT</span>
      <div className="mb-2">
        <span className="inline-block bg-[var(--mustard)] text-[var(--ink)] border-2 border-[var(--ink)] rounded-full px-3 py-0.5 text-[13px] font-bold uppercase tracking-wider">
          Anonymous by design · Limited safety data
        </span>
      </div>
      <h2 className="text-xl md:text-2xl font-bold uppercase mb-3 privacy-heading tracking-tight">
        Privacy Guarantee
      </h2>
      <p className="text-[var(--ink-soft)] text-[16px] md:text-[17px] font-normal leading-relaxed">
        No accounts are required. Our application does not store raw IP
        addresses or use browser fingerprints. We store only one-way hashes
        of delete keys so authors can delete their posts. Report reasons and
        counts remain for moderation. We count popular recipient searches,
        not who searched. Share images are generated on your device and are
        never uploaded by us. Hosting and music providers may process their own
        operational data.
      </p>
    </section>
  </div>
);

export default AboutView;
