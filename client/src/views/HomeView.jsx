import { ConfessionCard } from "../components/ui/ConfessionCard";
import Vinyl from "../components/ui/Vinyl";
import Doodle from "../components/ui/Doodle";
import StepCard from "../components/ui/StepCard";
import { WriteIcon, SearchIcon, ListenIcon } from "../components/icons/Index";

const HomeView = ({
  feed,
  isFeedLoading,
  feedError,
  onRetry,
  onSelectConfession,
  setView,
}) => {
  const tellStory = (
    <button
      type="button"
      onClick={() => setView("submit")}
      className="btn btn-primary px-7 py-3.5 font-bold text-sm"
    >
      Tell Your Story
    </button>
  );
  return (
    <div className="home-view px-4">
      <section className="hero">
        <div className="hero-copy">
          <h1 className="font-script font-bold leading-none">
            say it{" "}
            <span className="hero-loud">
              loud.
              <svg aria-hidden="true" viewBox="0 0 220 24">
                <path
                  d="M3 15Q40 0 76 12T145 11T217 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="text-lg md:text-xl mb-8">
            Untold words, sent through the song.
          </p>
          <div className="hero-actions flex flex-wrap gap-4">
            {tellStory}
            <button
              type="button"
              onClick={() => setView("browse")}
              className="btn btn-paper px-7 py-3.5 font-bold text-sm"
            >
              Browse Stories
            </button>
          </div>
        </div>
        <div
          className={`hero-cluster ${feed.length ? "hero-cluster--cards" : ""}`}
          role="group"
          aria-label="Latest confessions"
        >
          <Doodle className="hero-star" />
          <Doodle kind="note" className="hero-note" />
          {feed.length ? (
            feed.slice(0, 3).map((c) => (
              <div className="hero-tile" key={c.id}>
                <ConfessionCard
                  data={c}
                  onClick={() => onSelectConfession(c, { fromView: "home" })}
                />
              </div>
            ))
          ) : (
            <div className="vinyl-illustration">
              <Vinyl size="200px" />
              <Doodle kind="heart" />
            </div>
          )}
        </div>
      </section>
      <section className="steps-section">
        <h2 className="steps-heading font-mono text-[13px] font-bold tracking-widest text-center mb-8">
          How It Works
        </h2>
        <div className="steps-grid">
          <svg
            className="step-path"
            aria-hidden="true"
            viewBox="0 0 1000 80"
            preserveAspectRatio="none"
          >
            <path
              d="M0 40Q80 0 160 40T320 40T480 40T640 40T800 40T1000 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="6 8"
            />
          </svg>
          <StepCard
            number="01"
            title="Write it"
            description="Pick a song, pour out what you never said, and let it find its way to them."
            icon={<WriteIcon />}
          />
          <StepCard
            number="02"
            title="Search it"
            description="Someone might be thinking of you right now. Search your name and see."
            icon={<SearchIcon />}
          />
          <StepCard
            number="03"
            title="Listen it"
            description="Every story comes with a song. Press play and feel the whole thing."
            icon={<ListenIcon />}
          />
        </div>
      </section>
      <section className="fresh-feed">
        <div className="text-center mb-10">
          <h2 className="feed-title text-4xl md:text-5xl font-script font-bold mb-2">
            Fresh from the crate
          </h2>
          <p className="feed-subtitle text-[15px]">
            Newest confessions, each with its song.
          </p>
        </div>
        {isFeedLoading ? (
          <div
            className="pinboard"
            role="status"
            aria-label="Loading confessions"
          >
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-sleeve" aria-hidden="true">
                <Vinyl size="64px" />
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : feedError ? (
          <div role="alert" className="state-panel">
            <p className="mb-4">{feedError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-primary px-6 py-3 font-bold"
            >
              Try again
            </button>
          </div>
        ) : feed.length === 0 ? (
          <div className="state-panel">
            <div className="vinyl-illustration">
              <Vinyl size="100px" />
            </div>
            <p className="mb-6">Be the first to send a song.</p>
            {tellStory}
          </div>
        ) : (
          <div className="pinboard">
            {feed.map((c) => (
              <ConfessionCard
                key={c.id}
                data={c}
                onClick={() => onSelectConfession(c, { fromView: "home" })}
              />
            ))}
          </div>
        )}
      </section>
      <section className="bottom-cta">
        <h2 className="font-script text-4xl md:text-5xl font-bold">
          Got something you never said?
        </h2>
        {tellStory}
        <Doodle kind="heart" />
      </section>
    </div>
  );
};
export default HomeView;
