import { useMemo } from "react";
import { ConfessionCard } from "../components/ui/ConfessionCard";
import StepCard from "../components/ui/StepCard";
import { computeFeedLayout } from "../utils/feedLayout";

const HomeView = ({ feed, isFeedLoading, onSelectConfession, setView }) => {
  const feedLayout = useMemo(() => computeFeedLayout(feed), [feed]);

  return (
    <div className="animate-fade-in text-center px-4">
      <h1 className="text-6xl md:text-9xl font-script mb-4">say it loud.</h1>
      <p className="text-zinc-400 mb-8 font-medium">
        Untold words, sent through the song.
      </p>

      <div className="flex items-center justify-center gap-4 mb-20">
        <button
          onClick={() => setView("submit")}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800 transition-all"
        >
          Tell Your Story
        </button>
        <button
          onClick={() => setView("browse")}
          className="bg-white text-black px-6 py-3 rounded-xl font-bold border-2 border-black hover:bg-zinc-100 transition-all"
        >
          Browse the Stories
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6 mb-24">
        <StepCard
          title="Write it"
          description="Pick a song, pour out what you never said, and let it find its way to them."
        />
        <StepCard
          title="Search it"
          description="Someone might be thinking of you right now. Search your name and see."
        />
        <StepCard
          title="Listen it"
          description="Every story comes with a song. Press play and feel the whole thing."
        />
      </div>

      <div className="border-t-2 border-black bg-zinc-50 py-16 overflow-hidden min-h-[400px]">
        <div className="mb-8 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isFeedLoading ? "bg-zinc-300" : "bg-rose-400"} opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${isFeedLoading ? "bg-zinc-400" : "bg-rose-500"}`}
              ></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {isFeedLoading ? "Synchronizing Vibes..." : "Live Feed"}
            </span>
          </div>
        </div>

        {isFeedLoading ? (
          <div className="flex justify-center gap-8 px-10">
            <div className="w-[300px] h-[400px] bg-zinc-200 border-2 border-black rounded-2xl animate-pulse shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]"></div>
          </div>
        ) : feedLayout.mode === "double" ? (
          <div className="flex flex-col gap-10">
            {/* Row 1: Left Scroll */}
            <div className="animate-scroll flex w-max gap-8 hover:pause">
              {feedLayout.row1.map((c, i) => (
                <ConfessionCard
                  key={`r1-${i}`}
                  data={c}
                  onClick={() => onSelectConfession(c)}
                />
              ))}
            </div>
            {/* Row 2: Right Scroll (Reverse) */}
            <div
              className="animate-scroll flex w-max gap-8 hover:pause"
              style={{ animationDirection: "reverse" }}
            >
              {feedLayout.row2.map((c, i) => (
                <ConfessionCard
                  key={`r2-${i}`}
                  data={c}
                  onClick={() => onSelectConfession(c)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className={
              feedLayout.isScrollable
                ? "animate-scroll flex w-max gap-8"
                : "flex justify-center flex-wrap gap-8"
            }
          >
            {feedLayout.items.map((c, i) => (
              <ConfessionCard
                key={i}
                data={c}
                onClick={() => onSelectConfession(c)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeView;
