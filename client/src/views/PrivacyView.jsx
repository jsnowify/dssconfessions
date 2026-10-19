import Doodle from "../components/ui/Doodle";

export default function PrivacyView() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-block bg-[var(--coral)] text-white border-2 border-[var(--ink)] rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0_var(--ink)] mb-4">
          Privacy Policy
        </span>
        <h1 className="text-5xl md:text-6xl font-script font-bold text-[var(--ink)] mb-4">
          Privacy Policy & Trust
        </h1>
        <p className="text-[var(--ink-soft)] text-base max-w-xl mx-auto">
          Our commitment to complete anonymity, zero-IP logging, abuse
          prevention, and user-controlled content deletion.
        </p>
        <p className="font-mono text-xs text-[var(--ink-soft)] mt-3">
          Effective date: October 18, 2026
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Core Guarantee */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <div className="flex items-center gap-3 mb-3">
            <Doodle kind="heart" />
            <h2 className="text-2xl font-bold text-[var(--ink)]">
              1. Our Zero-IP Anonymity Guarantee
            </h2>
          </div>
          <p className="text-sm md:text-base text-[var(--ink)] leading-relaxed mb-4">
            DSSConfessions was founded on a simple principle: people should be
            able to share authentic, heartfelt feelings without worrying about
            surveillance, tracking, or digital profiling.
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-[var(--ink-soft)]">
            <li>
              <strong>No user accounts:</strong> We do not ask for email addresses,
              phone numbers, passwords, or social media logins.
            </li>
            <li>
              <strong>No raw IP logging:</strong> We never write your client IP
              address to any database table, log file, or analytics platform.
            </li>
            <li>
              <strong>No fingerprinting or identity cookies:</strong> We do not
              use device fingerprinting, tracking pixels, or commercial tracking cookies.
            </li>
            <li>
              <strong>No third-party trackers:</strong> We do not load Google
              Analytics, Meta Pixel, or any external advertising scripts.
            </li>
          </ul>
        </section>

        {/* Section 2: Author Delete Keys */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-3">
            2. Author Deletion Rights (Delete Keys)
          </h2>
          <p className="text-sm md:text-base text-[var(--ink)] leading-relaxed mb-4">
            You retain complete control over your confession after publishing.
            Upon submission, our system generates a private 16-character Delete
            Key.
          </p>
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-3">
            A secure one-way cryptographic hash of this key is stored with the
            confession. The plain-text key is never saved on our servers—only you
            hold it.
          </p>
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
            Entering your key on your confession card instantly deletes the
            confession and all associated data permanently from our database.
          </p>
        </section>

        {/* Section 3: Content Removal & Moderation */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-3">
            3. Takedown Requests & Moderation
          </h2>
          <p className="text-sm md:text-base text-[var(--ink)] leading-relaxed mb-4">
            If a confession mentions you and you want it taken down, or if you
            encounter harassment, bullying, or sensitive personal information,
            you can request immediate removal.
          </p>
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-3">
            Every card includes an in-app Report button with options such as{" "}
            <em>&quot;This is about me and I want it removed&quot;</em>. Submitting a
            report marks the post for review, and posts reaching threshold
            criteria are automatically hidden from the public feed.
          </p>
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
            For urgent takedown inquiries, contact:{" "}
            <a
              href="mailto:joshuacambronero.personal@gmail.com"
              className="bg-[var(--bg-wash)] px-2 py-0.5 rounded font-mono text-xs text-[var(--ink)] underline hover:text-[var(--primary)]"
            >
              joshuacambronero.personal@gmail.com
            </a>
          </p>
        </section>

        {/* Section 4: External Services */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-3">
            4. Third-Party Services
          </h2>
          <p className="text-sm md:text-base text-[var(--ink)] leading-relaxed mb-3">
            DSSC Confessions interacts with the following external service:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-[var(--ink-soft)]">
            <li>
              <strong>Spotify Web API:</strong> Used solely to search songs,
              verify track metadata, and render official album covers and embed
              previews. Your Spotify credentials are never requested or stored.
            </li>
          </ul>
        </section>

        {/* Section 5: School Community Context & Non-Affiliation */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-3">
            5. School Community Context &amp; Non-Affiliation
          </h2>
          <p className="text-sm md:text-base text-[var(--ink)] leading-relaxed mb-3">
            DSSC Confessions is an independent student project built for the student and campus community of Davao del Sur State College (DSSC) in Digos City, Davao del Sur.
          </p>
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-3">
            It is not affiliated with, operated by, or endorsed by the Davao del Sur State College administration. We do not access or handle student records, grades, enrollment, or official communications.
          </p>
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
            If you are a student, faculty member, or individual seeking removal of content regarding your name or likeness, please use the in-app Report flag or contact:{" "}
            <a
              href="mailto:joshuacambronero.personal@gmail.com"
              className="bg-[var(--bg-wash)] px-2 py-0.5 rounded font-mono text-xs text-[var(--ink)] underline hover:text-[var(--primary)]"
            >
              joshuacambronero.personal@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
