import { ConfessionCard } from "../components/ui/ConfessionCard";
import Vinyl from "../components/ui/Vinyl";
import Doodle from "../components/ui/Doodle";
import StepCard from "../components/ui/StepCard";
import { WriteIcon, SearchIcon, ListenIcon } from "../components/icons/Index";
import ReaderFontToggle from "../components/ui/ReaderFontToggle";

const HomeView = ({
  feed,
  isFeedLoading,
  feedError,
  onRetry,
  onSelectConfession,
  setView,
  hasMore = false,
  isLoadingMore = false,
  loadMoreError = null,
  onLoadMore,
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
          <p className="text-lg md:text-xl mb-3">
            Untold words, sent through the song.
          </p>
          <p className="text-xs text-(--ink-soft) mb-8">
            An anonymous music space for the{" "}
            <a
              href="/dssc-confessions"
              onClick={(e) => {
                e.preventDefault();
                setView("dssc-landing");
              }}
              className="font-bold underline text-(--ink) hover:text-(--primary)"
            >
              DSSC (Davao del Sur State College) community
            </a>
            . Independent student project, not affiliated with the college.
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
        <h2 className="steps-heading text-overline text-center mb-8">
          How It Works
        </h2>
        <div className="steps-grid">
          <svg
            className="step-path"
            aria-hidden="true"
            viewBox="0 0 1000 60"
            preserveAspectRatio="none"
          >
            <path
              d="M 0 30 Q 125 5, 250 30 T 500 30 Q 625 5, 750 30 T 1000 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10 max-w-6xl mx-auto px-4">
          <div className="text-center sm:text-left">
            <h2 className="feed-title text-4xl md:text-5xl font-script font-bold mb-2">
              Fresh from the crate
            </h2>
            <p className="feed-subtitle text-body-sm">
              Newest confessions, each with its song.
            </p>
          </div>
          <div className="w-full sm:w-auto flex flex-col items-center sm:items-end">
            <ReaderFontToggle variant="list" />
          </div>
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
          <>
            <div className="pinboard">
              {feed.map((c) => (
                <ConfessionCard
                  key={c.id}
                  data={c}
                  onClick={() => onSelectConfession(c, { fromView: "home" })}
                />
              ))}
            </div>

            {hasMore ? (
              <div className="flex flex-col items-center justify-center mt-10 mb-4 px-4">
                {loadMoreError ? (
                  <div role="alert" className="text-center mb-3">
                    <p className="text-body-sm text-(--coral) font-bold mb-2">
                      {loadMoreError}
                    </p>
                    <button
                      type="button"
                      onClick={onLoadMore}
                      className="btn btn-paper px-6 py-2.5 text-button font-bold"
                    >
                      Retry unpacking
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    className="btn btn-paper px-8 py-3.5 text-button font-bold flex items-center gap-3 transition-transform active:scale-95 shadow-[3px_3px_0_var(--ink)] hover:shadow-[1px_1px_0_var(--ink)] hover:translate-x-[2px] hover:translate-y-[2px]"
                    aria-label="Load more older confessions from the crate"
                  >
                    <Vinyl
                      size="22px"
                      className={isLoadingMore ? "is-spinning" : ""}
                    />
                    <span>
                      {isLoadingMore
                        ? "Flipping through records…"
                        : "Dig deeper into the crate"}
                    </span>
                  </button>
                )}
                <span className="text-meta text-(--ink-soft) mt-3">
                  Showing {feed.length} stories • Older records waiting below
                </span>
              </div>
            ) : feed.length > 0 ? (
              <div className="text-center mt-12 mb-4 px-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-(--ink-soft)/40 bg-(--bg-wash) text-meta text-(--ink-soft) font-mono">
                  <span>●</span>
                  <span>End of the crate • {feed.length} stories discovered</span>
                </div>
              </div>
            ) : null}
          </>
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
