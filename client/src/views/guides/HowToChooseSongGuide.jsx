import Doodle from "../../components/ui/Doodle";

export default function HowToChooseSongGuide({ setView }) {
  return (
    <article className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-block bg-(--coral) text-(--ink) border-2 border-(--ink) rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0_var(--ink)] mb-4">
          Guide • Song Curation
        </span>
        <h1 className="text-4xl md:text-5xl font-script font-bold text-(--ink) mb-4">
          How to Choose a Song for Your Confession
        </h1>
        <p className="text-(--ink-soft) text-base max-w-xl mx-auto">
          The right soundtrack says what words cannot. Explore song
          recommendations and pairing strategies organized by emotion.
        </p>
        <p className="text-xs text-(--ink-soft) mt-3">
          Published: October 18, 2026 • Curated for DSSConfessions
        </p>
      </div>

      {/* Answer-first Summary Box for AEO */}
      <div className="bg-(--bg-wash) border-2 border-(--ink) rounded-2xl p-6 mb-10 shadow-[3px_3px_0_var(--ink)]">
        <h2 className="text-lg font-bold text-(--ink) mb-2 flex items-center gap-2">
          <Doodle kind="note" />
          Quick Recommendation
        </h2>
        <p className="text-sm md:text-base text-(--ink) leading-relaxed">
          To choose the ideal song for your confession on DSSConfessions, match
          the track&apos;s emotional tempo to your message. Select a shared
          memory song if one exists; otherwise, select a track categorized by
          your core feeling—such as <em>kilig</em>, quiet longing, sincere
          apology, or grateful closure. Search by track title or artist directly
          in the Confess form.
        </p>
      </div>

      <div className="space-y-10 text-(--ink) leading-relaxed text-sm md:text-base">
        {/* Category 1: Miss You & Longing */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" aria-hidden="true">🌧️</span>
            <h2 className="text-2xl font-bold">
              1. Missing Someone, Longing & Distance
            </h2>
          </div>
          <p className="mb-4">
            When physical or emotional distance separates you from someone,
            music bridges the silence. Songs in this mood usually carry gentle
            acoustic melodies, lingering piano chords, or reflective indie vibes.
          </p>
          <div className="bg-(--bg-wash) border border-(--ink)/30 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-(--ink-soft) mb-2">
              Recommended Tracks (Searchable on Spotify)
            </h3>
            <ul className="space-y-1.5 text-xs text-(--ink)">
              <li>• &quot;Oceans & Engines&quot; by NIKI</li>
              <li>• &quot;Leonora&quot; by Sugarcane</li>
              <li>• &quot;Leaves&quot; by Ben&amp;Ben</li>
              <li>• &quot;Sparks&quot; by Coldplay</li>
              <li>• &quot;Right Here Waiting&quot; by Richard Marx</li>
            </ul>
          </div>
          <p className="text-xs text-(--ink-soft) italic">
            <strong>Pairing advice:</strong> Write about a specific shared place
            or time you reminisce about. Let the quiet instrumental space of the
            song give the reader room to reflect.
          </p>
        </section>

        {/* Category 2: Kilig & Crushes */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" aria-hidden="true">✨</span>
            <h2 className="text-2xl font-bold">
              2. Kilig, Secret Crushes & Falling in Love
            </h2>
          </div>
          <p className="mb-4">
            For that nervous, fluttery warmth when someone crosses your mind, pick
            upbeat acoustic tracks, indie pop tunes, or cozy bedroom pop rhythms.
          </p>
          <div className="bg-(--bg-wash) border border-(--ink)/30 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-(--ink-soft) mb-2">
              Recommended Tracks (Searchable on Spotify)
            </h3>
            <ul className="space-y-1.5 text-xs text-(--ink)">
              <li>• &quot;Palagi&quot; by TJ Monterde</li>
              <li>• &quot;Until I Found You&quot; by Stephen Sanchez</li>
              <li>• &quot;Mahika&quot; by Adie, Janine Berdin</li>
              <li>• &quot;glue song&quot; by beabadoobee</li>
              <li>• &quot;Golden Hour&quot; by JVKE</li>
            </ul>
          </div>
          <p className="text-xs text-(--ink-soft) italic">
            <strong>Pairing advice:</strong> Keep the message bright and sincere.
            A subtle inside joke or mention of a moment in class or work will
            make the recipient smile while listening.
          </p>
        </section>

        {/* Category 3: Sorry & Apologies */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" aria-hidden="true">🕊️</span>
            <h2 className="text-2xl font-bold">
              3. Apology, Regret & Seeking Forgiveness
            </h2>
          </div>
          <p className="mb-4">
            Saying &quot;I&apos;m sorry&quot; can feel daunting in person. An
            honest confession paired with a somber, humble song can open the door
            to healing without putting undue pressure on the other person.
          </p>
          <div className="bg-(--bg-wash) border border-(--ink)/30 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-(--ink-soft) mb-2">
              Recommended Tracks (Searchable on Spotify)
            </h3>
            <ul className="space-y-1.5 text-xs text-(--ink)">
              <li>• &quot;The Scientist&quot; by Coldplay</li>
              <li>• &quot;Back to December&quot; by Taylor Swift</li>
              <li>• &quot;Hard To Say I&apos;m Sorry&quot; by Chicago</li>
              <li>• &quot;Sana&quot; by I Belong to the Zoo</li>
              <li>• &quot;Patawad, Paalam&quot; by Moira Dela Torre, I Belong to the Zoo</li>
            </ul>
          </div>
          <p className="text-xs text-(--ink-soft) italic">
            <strong>Pairing advice:</strong> Own your part honestly. Do not make
            excuses in the confession text, and let the song convey genuine
            humility.
          </p>
        </section>

        {/* Category 4: Gratitude & Friendship */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" aria-hidden="true">💛</span>
            <h2 className="text-2xl font-bold">
              4. Gratitude, Friendship & Appreciating Someone
            </h2>
          </div>
          <p className="mb-4">
            Not all confessions are romantic. Some of the most meaningful
            messages are unexpressed appreciation for friends, mentors, or
            classmates who made a hard season bearable.
          </p>
          <div className="bg-(--bg-wash) border border-(--ink)/30 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-(--ink-soft) mb-2">
              Recommended Tracks (Searchable on Spotify)
            </h3>
            <ul className="space-y-1.5 text-xs text-(--ink)">
              <li>• &quot;You&apos;ve Got a Friend in Me&quot; by Randy Newman</li>
              <li>• &quot;With a Little Help from My Friends&quot; by The Beatles</li>
              <li>• &quot;Count on Me&quot; by Bruno Mars</li>
              <li>• &quot;Stand by Me&quot; by Ben E. King</li>
              <li>• &quot;Rainbow&quot; by South Border</li>
            </ul>
          </div>
          <p className="text-xs text-(--ink-soft) italic">
            <strong>Pairing advice:</strong> Mention the specific moment they
            showed kindness. It reassures them that their presence was truly
            valued.
          </p>
        </section>

        {/* Category 5: Moving On & Bittersweet Closure */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" aria-hidden="true">🌅</span>
            <h2 className="text-2xl font-bold">
              5. Moving On, Letting Go & Bittersweet Closure
            </h2>
          </div>
          <p className="mb-4">
            Letting go requires releasing words into the universe. Bittersweet
            songs honor what once existed while acknowledging that it is time to
            take the next step.
          </p>
          <div className="bg-(--bg-wash) border border-(--ink)/30 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-(--ink-soft) mb-2">
              Recommended Tracks (Searchable on Spotify)
            </h3>
            <ul className="space-y-1.5 text-xs text-(--ink)">
              <li>• &quot;Somewhere Only We Know&quot; by Keane</li>
              <li>• &quot;Happier&quot; by Ed Sheeran</li>
              <li>• &quot;Kathang Isip&quot; by Ben&amp;Ben</li>
              <li>• &quot;Glimpse of Us&quot; by Joji</li>
              <li>• &quot;Ilaw sa Daan&quot; by IV Of Spades</li>
            </ul>
          </div>
          <p className="text-xs text-(--ink-soft) italic">
            <strong>Pairing advice:</strong> Write with resolution rather than
            resentment. Releasing your feelings into a song brings closure.
          </p>
        </section>

        {/* 3 Pro Curation Tips */}
        <section className="bg-(--surface) border-2 border-(--ink) rounded-2xl p-6 md:p-8 shadow-[3px_3px_0_var(--ink)]">
          <h2 className="text-2xl font-bold mb-4">
            Three Golden Rules for Song Selection
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-(--bg-wash) border border-(--ink)/30 rounded-xl">
              <h3 className="font-bold text-sm mb-1">1. Match the Mood</h3>
              <p className="text-(--ink-soft)">
                Avoid pairing a heavy emotional apology with a high-energy dance
                pop track. Let the tempo support the message.
              </p>
            </div>
            <div className="p-4 bg-(--bg-wash) border border-(--ink)/30 rounded-xl">
              <h3 className="font-bold text-sm mb-1">2. Prioritize Shared Moments</h3>
              <p className="text-(--ink-soft)">
                If there was a song playing in the car or a playlist you both
                shared, that song will always resonate louder than any top hit.
              </p>
            </div>
            <div className="p-4 bg-(--bg-wash) border border-(--ink)/30 rounded-xl">
              <h3 className="font-bold text-sm mb-1">3. Check the Artist</h3>
              <p className="text-(--ink-soft)">
                Selecting their favorite artist shows you paid attention to their
                tastes, making the anonymous dedication feel intimate.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* CTA Section */}
      <div className="mt-12 bg-(--surface) border-2 border-(--ink) rounded-2xl p-8 text-center shadow-[4px_4px_0_var(--ink)]">
        <h3 className="text-2xl font-bold text-(--ink) mb-2">
          Found the song you want to dedicate?
        </h3>
        <p className="text-sm text-(--ink-soft) mb-6 max-w-md mx-auto">
          Head over to the submission form and search for your chosen track.
        </p>
        <button
          type="button"
          onClick={() => setView("submit")}
          className="btn btn-ink px-8 py-3.5 font-bold text-sm uppercase tracking-wider cursor-pointer"
        >
          Attach a Song & Post
        </button>
      </div>
    </article>
  );
}
