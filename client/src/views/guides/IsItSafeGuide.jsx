import Doodle from "../../components/ui/Doodle";

export default function IsItSafeGuide({ setView }) {
  return (
    <article className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-block bg-[var(--sage)] text-[var(--ink)] border-2 border-[var(--ink)] rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0_var(--ink)] mb-4">
          Guide • Safety & Privacy
        </span>
        <h1 className="text-4xl md:text-5xl font-script font-bold text-[var(--ink)] mb-4">
          Is It Safe to Send an Anonymous Confession?
        </h1>
        <p className="text-[var(--ink-soft)] text-base max-w-xl mx-auto">
          Understand how DSSConfessions protects your privacy, how our
          zero-IP architecture functions, and what guidelines keep everyone safe.
        </p>
        <p className="font-mono text-xs text-[var(--ink-soft)] mt-3">
          Published: October 18, 2026 • Verified Privacy Standards
        </p>
      </div>

      {/* Answer-first Summary Box for AEO */}
      <div className="bg-[var(--bg-wash)] border-2 border-[var(--ink)] rounded-2xl p-6 mb-10 shadow-[3px_3px_0_var(--ink)]">
        <h2 className="text-lg font-bold text-[var(--ink)] mb-2 flex items-center gap-2">
          <Doodle kind="note" />
          Direct Answer
        </h2>
        <p className="text-sm md:text-base text-[var(--ink)] leading-relaxed">
          Yes, sending a confession on DSSConfessions is safe and truly
          anonymous. We require zero user accounts, log zero raw IP addresses,
          and track zero personal identities. Rate limiting and poke counters
          rely on ephemeral cryptographic hashes salted with daily rotating
          secrets. Every author receives a private one-time Delete Key to purge
          their submission at any time.
        </p>
      </div>

      <div className="space-y-10 text-[var(--ink)] leading-relaxed text-sm md:text-base">
        {/* Core Privacy Pillar 1: Zero Accounts */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            1. Zero User Accounts or Profiling
          </h2>
          <p className="mb-4">
            Most social platforms require you to sign in with Google, an email
            address, or a phone number. These accounts create persistent digital
            fingerprints that follow you across the internet.
          </p>
          <p className="mb-4">
            DSSConfessions has <strong>no sign-up flow, no user database, and no
            session cookies</strong>. You browse, submit, and interact as a
            completely stateless participant.
          </p>
        </section>

        {/* Core Privacy Pillar 2: Zero-IP Architecture */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            2. Strict Zero-IP Architecture
          </h2>
          <p className="mb-4">
            When you send a request over the internet, web servers receive your
            network IP address. Many platforms store this IP alongside your
            content in a database column.
          </p>
          <p className="mb-4">
            DSSConfessions takes an uncompromising privacy stance:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4 text-[var(--ink)]">
            <li>
              <strong>No IP columns in database:</strong> Our database schemas have
              no IP address storage fields.
            </li>
            <li>
              <strong>Daily rotating HMAC salts:</strong> For abuse prevention,
              spam prevention, and poke deduplication, your IP is passed through
              a one-way HMAC-SHA256 hash combined with a secret salt and the
              current UTC date.
            </li>
            <li>
              <strong>Automatic daily reset:</strong> When the UTC date rotates,
              past hashes become mathematically irrecoverable. We cannot trace a
              post back to a physical person or internet connection.
            </li>
          </ul>
        </section>

        {/* Core Privacy Pillar 3: Delete Key & Self-Sovereignty */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            3. Author Sovereignty: The Private Delete Key
          </h2>
          <p className="mb-4">
            When you publish a confession, our server generates a high-entropy,
            single-use <strong>Delete Key</strong> and transmits it back to your
            browser exactly once.
          </p>
          <p className="mb-4">
            Because we do not know your identity, we cannot verify you through an
            email reset link. Instead, holding the Delete Key gives you sole
            cryptographic proof of authorship. Whenever you decide to take down
            the confession, enter your Delete Key on the card, and the post is
            instantly purged from our primary database.
          </p>
        </section>

        {/* Safety Guidelines: What NOT to Share */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            4. Staying Safe: What NOT to Include in Confessions
          </h2>
          <p className="mb-4">
            While DSSConfessions protects your technical identity, you must
            protect your circumstantial identity through mindful writing:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-wash)] border border-red-300 dark:border-red-900 rounded-xl p-4">
              <h3 className="font-bold text-red-600 dark:text-red-400 text-sm mb-2">
                ❌ Never Share
              </h3>
              <ul className="space-y-1.5 text-xs text-[var(--ink-soft)]">
                <li>• Full legal names or home addresses</li>
                <li>• Phone numbers, email addresses, or social handles</li>
                <li>• Specific classroom numbers or exact schedules</li>
                <li>• Defamatory statements or harassment</li>
                <li>• Private passwords, pins, or secrets</li>
              </ul>
            </div>
            <div className="bg-[var(--bg-wash)] border border-emerald-300 dark:border-emerald-900 rounded-xl p-4">
              <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-2">
                ✅ Safe to Share
              </h3>
              <ul className="space-y-1.5 text-xs text-[var(--ink-soft)]">
                <li>• First names or gentle nicknames</li>
                <li>• Sincere emotions, gratitude, and apologies</li>
                <li>• Shared nostalgia and memories</li>
                <li>• Favorite songs and musical soundtracks</li>
                <li>• Constructive reflections and good wishes</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Takedown Process */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            5. Takedowns & Reporting
          </h2>
          <p className="mb-4">
            If a confession is written about you without your consent or contains
            harmful content, anyone can flag it immediately:
          </p>
          <ol className="list-decimal list-inside space-y-2 mb-4 text-[var(--ink)]">
            <li>Locate the card and tap the <strong>Report</strong> flag icon.</li>
            <li>Select &quot;This is about me and I want it removed&quot; or your applicable concern.</li>
            <li>
              Once a confession receives community flags surpassing our moderation
              threshold, it is automatically hidden from public view.
            </li>
          </ol>
        </section>

        {/* Feature Comparison Table */}
        <section className="bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)] overflow-x-auto">
          <h2 className="text-2xl font-bold mb-4">
            Privacy Model Comparison
          </h2>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--ink)]">
                <th className="py-2 pr-4 font-bold">Privacy Feature</th>
                <th className="py-2 pr-4 font-bold text-emerald-600 dark:text-emerald-400">DSSConfessions</th>
                <th className="py-2 font-bold text-[var(--ink-soft)]">Standard Social Media</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ink)]/15">
              <tr>
                <td className="py-2.5 pr-4 font-semibold">Account Required?</td>
                <td className="py-2.5 pr-4 text-emerald-600 dark:text-emerald-400 font-bold">Never (0 accounts)</td>
                <td className="py-2.5 text-[var(--ink-soft)]">Always required (Email/Phone)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold">Raw IP Stored in DB?</td>
                <td className="py-2.5 pr-4 text-emerald-600 dark:text-emerald-400 font-bold">Never (Zero-IP)</td>
                <td className="py-2.5 text-[var(--ink-soft)]">Stored permanently in logs</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold">Self-Service Deletion?</td>
                <td className="py-2.5 pr-4 text-emerald-600 dark:text-emerald-400 font-bold">Yes (via Delete Key)</td>
                <td className="py-2.5 text-[var(--ink-soft)]">Requires active login</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-semibold">3rd Party Tracking Ad Pixels?</td>
                <td className="py-2.5 pr-4 text-emerald-600 dark:text-emerald-400 font-bold">Zero</td>
                <td className="py-2.5 text-[var(--ink-soft)]">Multiple ad networks</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {/* CTA Section */}
      <div className="mt-12 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-2xl p-8 text-center shadow-[4px_4px_0_var(--ink)]">
        <h3 className="text-2xl font-bold text-[var(--ink)] mb-2">
          Read More in Our FAQ &amp; Privacy Policy
        </h3>
        <p className="text-sm text-[var(--ink-soft)] mb-6 max-w-md mx-auto">
          Explore complete technical disclosures, deletion key guides, and terms.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            type="button"
            onClick={() => setView("faq")}
            className="btn btn-ink px-6 py-3 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Read FAQ
          </button>
          <button
            type="button"
            onClick={() => setView("privacy")}
            className="btn btn-secondary px-6 py-3 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Read Privacy Policy
          </button>
        </div>
      </div>
    </article>
  );
}
