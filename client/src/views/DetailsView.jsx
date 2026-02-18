import { getVibe } from "../utils/vibes";
import { useExport } from "../hooks/useExport";

const DetailsView = ({ selectedConfession, setView }) => {
  const { isExporting, handleDownloadImage } = useExport();

  if (!selectedConfession) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 relative pb-20 pt-10">
      <div
        className={`absolute top-0 w-full h-[50vh] bg-gradient-to-b ${getVibe(selectedConfession.spotify_url).bg} to-white pointer-events-none`}
      />
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 z-10">
        <button
          onClick={() => setView("browse")}
          className="px-6 py-2 bg-white border-2 border-black rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          ← Back
        </button>
        <button
          onClick={() => handleDownloadImage(selectedConfession)}
          disabled={isExporting}
          className="px-6 py-2 bg-rose-500 text-white border-2 border-black rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? "⏳ Generating..." : "📸 Save for IG"}
        </button>
      </div>
      <h1 className="text-5xl md:text-7xl font-script mb-10 z-10 text-center px-4">
        Hello, {selectedConfession.recipient_to}
      </h1>
      <div className="w-full max-w-[450px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-2xl border-2 border-black overflow-hidden bg-black z-10 mb-10">
        <iframe
          src={`https://open.spotify.com/embed/track/${selectedConfession.spotify_url?.split("/track/")[1]?.split("?")[0]}?utm_source=generator&theme=0`}
          width="100%"
          height="380"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Player"
        />
      </div>
      <p className="text-3xl md:text-4xl font-script italic z-10 text-center max-w-xl px-4 text-balance animate-fade-in">
        "{selectedConfession.content}"
      </p>
      <p className="mt-10 text-[10px] font-mono font-bold uppercase z-10 text-center">
        SENT VIA DSSCONFESSIONS • FROM: {selectedConfession.sender_from}
      </p>
    </div>
  );
};

export default DetailsView;
