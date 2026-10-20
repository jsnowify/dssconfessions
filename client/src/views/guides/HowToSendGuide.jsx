import PageLink from "../../components/ui/PageLink";
import Doodle from "../../components/ui/Doodle";

export default function HowToSendGuide({ setView }) {
  return (
    <article className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-block bg-(--butter) text-(--ink) border-2 border-(--ink) rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0_var(--ink)] mb-4">
          Guide • 5 Min Read
        </span>
        <h1 className="text-4xl md:text-5xl font-script font-bold text-(--ink) mb-4">
          How to Send an Anonymous Song Confession
        </h1>
        <p className="text-(--ink-soft) text-base max-w-xl mx-auto">
          A comprehensive guide to putting your feelings into words, attaching
          the perfect Spotify soundtrack, and keeping your submission safe.
        </p>
        <p className="text-xs text-(--ink-soft) mt-3">
          Published: October 18, 2026 • Verified for DSSConfessions
        </p>
      </div>

      {/* Answer-first Summary Box */}
      <div className="bg-(--bg-wash) border-2 border-(--ink) rounded-2xl p-6 mb-10 shadow-[3px_3px_0_var(--ink)]">
        <h2 className="text-lg font-bold text-(--ink) mb-2 flex items-center gap-2">
          <Doodle kind="note" />
          Quick Answer
        </h2>
        <p className="text-sm md:text-base text-(--ink) leading-relaxed">
          To send an anonymous confession on DSSConfessions, navigate to the{" "}
          <strong>Confess</strong> page, enter the recipient&apos;s name, write
          your message, search Spotify for your soundtrack, and click{" "}
          <strong>Post Confession</strong>. You will instantly receive a
          private Delete Key to remove your post whenever you choose, with zero
          account sign-up required.
        </p>
      </div>

      <div className="space-y-10 text-(--ink) leading-relaxed text-sm md:text-base">
        {/* Step 1 */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            Step 1: Choose Your Recipient and Sender Identity
          </h2>
          <p className="mb-4">
            Every confession starts with identifying who your message is meant
            for. In the <strong>To</strong> field, enter the name or nickname of
            the person you are writing to (e.g., &quot;Sarah&quot;, &quot;Ry&quot;,
            &quot;Crush from Bio Class&quot;). This is the term people can search
            for on the Browse page to find confessions written for them.
          </p>
          <p className="mb-4">
            Next, consider the <strong>From</strong> field. By default, leaving
            this blank marks the confession as &quot;Anonymous&quot;. If you want
            to leave a playful hint or an inside joke that only your recipient
            would recognize (like &quot;Your Library Seatmate&quot; or &quot;The
            boy with the green umbrella&quot;), you can type that as your pseudonym.
          </p>
          <div className="bg-(--bg-wash) border border-(--ink)/30 rounded-xl p-4 text-xs">
            <strong>Tip:</strong> Avoid using full legal names or phone numbers
            in the recipient field to respect community privacy standards.
          </div>
        </section>

        {/* Step 2 */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            Step 2: Write Your Unspoken Words
          </h2>
          <p className="mb-4">
            DSSConfessions supports messages up to 3,000 characters. Whether you
            are sharing a quiet crush, a sincere apology, a message of gratitude
            to a friend, or reminiscing about a shared memory, write from the
            heart.
          </p>
          <p className="mb-4">
            Our card reader formats your message in our authentic handwriting font
            with soft line wraps. If your message is long, readers will see the
            first five lines and can expand the card to read the complete text.
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-(--ink-soft)">
            <li>Keep it sincere and expressive.</li>
            <li>Do not include sensitive personal contact information.</li>
            <li>Focus on shared experiences, feelings, and emotions.</li>
          </ul>
        </section>

        {/* Step 3 */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            Step 3: Pair the Message with a Spotify Soundtrack
          </h2>
          <p className="mb-4">
            The soundtrack is what gives your confession its life. DSSConfessions
            connects directly with Spotify so you can select the exact song that
            embodies your feelings.
          </p>
          <p className="mb-4">
            Type the song title or artist name into the search bar. Our search
            shows official album art and artist names. When you select a track,
            it attaches to your card and embeds a full Spotify player in the
            detailed view so the recipient can hear the music.
          </p>
        </section>

        {/* Step 4 */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            Step 4: Check the Live Preview & Post
          </h2>
          <p className="mb-4">
            On the right-hand side (or below on mobile), the Live Preview displays
            the exact card that will appear in the public feed. You can review
            the typography, song badge, and recipient tag before finalizing.
          </p>
          <p className="mb-4">
            When you are happy with how your card looks, tap{" "}
            <strong>Post Confession</strong>. Submissions pass server-side
            validation and are posted within seconds.
          </p>
        </section>

        {/* Step 5 */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            Step 5: Save Your Private Delete Key
          </h2>
          <p className="mb-4">
            Immediately after posting, a modal will show your private{" "}
            <strong>Delete Key</strong> (e.g., <code>ABCD-1234-EFGH-5678</code>).
            This key belongs solely to you. Copy it or write it down.
          </p>
          <p className="mb-4">
            If you ever change your mind or want to take your confession down,
            open your confession card, click the options icon, enter your Delete
            Key, and confirm. The confession is permanently deleted from the
            database with zero trace.
          </p>
        </section>
      </div>

      {/* CTA Section */}
      <div className="mt-12 bg-(--surface) border-2 border-(--ink) rounded-2xl p-8 text-center shadow-[4px_4px_0_var(--ink)]">
        <h3 className="text-2xl font-bold text-(--ink) mb-2">
          Ready to put your thoughts into music?
        </h3>
        <p className="text-sm text-(--ink-soft) mb-6 max-w-md mx-auto">
          Write your story, attach a track, and let it speak for you anonymously.
        </p>
        <PageLink href="/confess" view="submit" setView={setView} className="btn btn-ink px-8 py-3.5 font-bold text-sm uppercase tracking-wider cursor-pointer">
          Open the Confess Form
        </PageLink>
      </div>
    </article>
  );
}
