import Doodle from "../components/ui/Doodle";

const AboutView = () => (
  <div className="liner-notes max-w-5xl mx-auto px-6 animate-fade-in pt-12 pb-24 about-bento">
    {/* Heading with top padding (Fix #15: padding-block 3rem 2rem) */}
    <h1 className="text-5xl md:text-6xl about-title font-script text-center font-bold mb-8">
      About
    </h1>

    {/* Section 1: The Creator (Fix #10: consistent card treatment) */}
    <section className="sleeve-panel about-tile about-tile--creator p-7 md:p-8">
      <span className="liner-tag font-mono">CREDITS</span>
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
        engineering craft with real community vibes.
      </p>
    </section>

    {/* Section 2: Inspiration (Fix #10: consistent card treatment, no weird disabled gray) */}
    <section className="sleeve-panel about-tile about-tile--inspiration p-7 md:p-8">
      <span className="liner-tag font-mono">LINER NOTES</span>
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

    {/* Section 3: Privacy Guarantee (Fix #10: only Privacy gets accent highlight) */}
    <section className="sleeve-panel about-tile about-tile--privacy p-7 md:p-8 relative">
      <Doodle kind="shield" className="privacy-doodle" />
      <span className="liner-tag font-mono">THE FINE PRINT</span>
      <div className="mb-2">
        <span className="inline-block bg-[var(--mustard)] text-[var(--ink)] border-2 border-[var(--ink)] rounded-full px-3 py-0.5 text-[13px] font-mono font-bold uppercase tracking-wider">
          Anonymous by design · Limited safety data
        </span>
      </div>
      <h2 className="text-xl md:text-2xl font-bold uppercase mb-3 privacy-heading tracking-tight">
        Privacy Guarantee
      </h2>
      <p className="text-[var(--ink-soft)] text-[16px] md:text-[17px] font-normal leading-relaxed">
        No accounts are required. Our application does not store raw IP
        addresses or use browser fingerprints. Our database stores only hashes
        of delete keys. Rate limiting uses expiring hashed counters; report
        de-duplication uses a daily-changing hash, cleared by scheduled cleanup
        after 14 days. Report reasons and counts remain for moderation. We count
        popular recipient searches, not who searched. Share images are generated
        on your device and are never uploaded by us. Hosting and music providers
        may process their own operational data.
      </p>
    </section>
  </div>
);

export default AboutView;
