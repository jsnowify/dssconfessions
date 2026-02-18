const AboutView = () => (
  <div className="max-w-3xl mx-auto px-6 animate-fade-in space-y-12 pb-20">
    <h2 className="text-6xl font-script text-center mb-12 font-bold">About</h2>
    <section className="bg-white border-2 border-black p-8 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h3 className="text-2xl font-bold uppercase mb-4 tracking-tighter">
        The Creator
      </h3>
      <p className="text-zinc-600 font-medium leading-relaxed">
        Hi, I'm <span className="text-black font-bold">Snowi Wu</span>, a
        4th-year BSIT student. I built this for fun and to practice software
        engineering skills.
      </p>
    </section>
    <section className="bg-zinc-50 border-2 border-black p-8 rounded-2xl">
      <h3 className="text-2xl font-bold uppercase mb-4 italic tracking-tighter text-black/40">
        Inspiration
      </h3>
      <p className="text-zinc-600 font-medium leading-relaxed">
        In the digital age, we often leave things unsaid. This project is a
        tribute to the raw, unspoken emotions that connect us all. Inspired by
        the poignant beauty of{" "}
        <span className="text-black font-bold underline">SendTheSong</span>, it
        serves as a digital vessel for your untold stories, carried by the
        melodies that define them.
      </p>
    </section>
    <section className="bg-white border-2 border-black p-8 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h3 className="text-2xl font-bold uppercase mb-4 text-rose-600 tracking-tighter">
        Privacy Guarantee
      </h3>
      <p className="text-zinc-600 font-medium leading-relaxed">
        Your secrets are safe here. This platform operates on a philosophy of
        absolute anonymity. We do not track IP addresses, browser fingerprints,
        or personal metadata. What you say here remains between you, the music,
        and the void.
      </p>
    </section>
  </div>
);

export default AboutView;
