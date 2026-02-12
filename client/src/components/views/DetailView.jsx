import React, { useMemo } from "react";
import { getVibe } from "../../utils/theme";

export const DetailView = React.memo(({ data, onBack }) => {
  const trackId = useMemo(
    () => data?.spotify_url?.split("/track/")[1]?.split("?")[0],
    [data],
  );
  const vibe = useMemo(() => getVibe(trackId), [trackId]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center relative overflow-hidden animate-fade-in">
      <div
        className={`absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b ${vibe.bg} to-white pointer-events-none`}
      />
      <div className="w-full max-w-2xl mt-10 mb-8 px-6 z-10">
        <button
          onClick={onBack}
          className="text-[10px] font-bold text-zinc-500 hover:text-black uppercase tracking-widest flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-black/5 shadow-sm transition-all"
        >
          ← Back
        </button>
      </div>
      <div className="text-center mb-10 px-6 z-10">
        <h1 className="text-5xl md:text-7xl font-script mb-4 text-black">
          Hello, {data.recipient_to}
        </h1>
        <p className="text-zinc-600 text-sm md:text-base max-w-xs mx-auto leading-relaxed">
          Someone sent you a song. They want you to hear this...
        </p>
      </div>
      <div className="w-[90%] max-w-[450px] mb-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-2xl border-2 border-black overflow-hidden bg-black z-10">
        {trackId && (
          <iframe
            src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
            width="100%"
            height="380"
            frameBorder="0"
            allowFullScreen=""
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          />
        )}
      </div>
      <div className="text-center max-w-xl mx-auto z-10 px-8 pb-32">
        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-6 tracking-[0.2em]">
          Message from the sender:
        </p>
        <p className="text-3xl md:text-4xl font-script text-black leading-snug break-words">
          "{data.content}"
        </p>
        <div className="mt-12 pt-8 border-t border-zinc-200 w-16 mx-auto" />
        <p className="text-[11px] font-mono text-black font-bold uppercase tracking-wider text-black">
          FROM: {data.sender_from} •{" "}
          {new Date(data.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
});
