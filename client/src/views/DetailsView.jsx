import { ConfessionCard } from "../components/ui/ConfessionCard";
import { recipientLabel } from "../utils/confession-labels";
import { useExport } from "../hooks/useExport";
import { useState } from "react";
import ConfessionFeatures from "../components/ui/ConfessionFeatures";

const DetailsView = ({
  selectedConfession,
  onBack,
  fromView = "home",
  isLoading = false,
  error = null,
  onDeleted,
}) => {
  const { isExporting, handleDownloadImage } = useExport();
  const [replyTrack, setReplyTrack] = useState(null);

  if (isLoading) {
    return (
      <div className="details-view min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="sr-only">Confession</h1>
        <div className="w-8 h-8 border-2 border-[var(--ink)] border-t-[var(--mustard)] rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-wider text-[var(--text-soft)]">
          Loading confession...
        </p>
      </div>
    );
  }

  if (error || !selectedConfession) {
    return (
      <div className="details-view min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-script font-bold mb-3 text-[var(--ink)]">
          Confession not found
        </h1>
        <p className="text-[var(--ink-soft)] text-base mb-6 max-w-md">
          {error ||
            "This confession might have been removed, or the link may be incorrect."}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-paper px-6 py-2.5 text-[13px] font-bold uppercase tracking-widest cursor-pointer"
        >
          ← {fromView === "browse" ? "Back to Browse" : "Back to Home"}
        </button>
      </div>
    );
  }

  const trackId =
    replyTrack ||
    selectedConfession.spotify_url?.split("/track/")[1]?.split("?")[0];

  return (
    <div className="details-view min-h-screen flex flex-col items-center px-4 relative pb-20 pt-10">
      {/* Top Navigation */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 z-10">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-paper px-5 py-2.5 text-[13px] font-bold uppercase tracking-widest cursor-pointer"
        >
          ← {fromView === "browse" ? "Back to Browse" : "Back to Home"}
        </button>
        <button
          type="button"
          onClick={() => handleDownloadImage(selectedConfession)}
          disabled={isExporting}
          className="btn btn-paper px-5 py-2.5 text-[13px] font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? "Generating..." : "Save for IG"}
        </button>
      </div>

      {/* Recipient Title (keeping handwriting font) */}
      <h1 className="text-5xl md:text-7xl font-handwritten mb-8 z-10 text-center px-4 text-[var(--ink)] break-words max-w-full">
        Hello, {recipientLabel(selectedConfession)}
      </h1>

      <div className="detail-card-wrap">
        <ConfessionCard
          data={selectedConfession}
          full
          onClick={() =>
            document.querySelector('iframe[title="Spotify Player"]')?.focus()
          }
        />
      </div>

      {/* Spotify Embed Player */}
      {trackId ? (
        <div className="w-full max-w-[450px] shadow-[6px_6px_0_var(--ink)] rounded-xl border-2 border-[var(--ink)] overflow-hidden bg-[var(--surface)] z-10 mb-8">
          <iframe
            src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
            width="100%"
            height="380"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify Player"
          />
        </div>
      ) : (
        <div className="w-full max-w-[450px] p-6 bg-[var(--sleeve)] border-2 border-[var(--ink)] rounded-xl text-center mb-8 z-10 shadow-[4px_4px_0_var(--ink)]">
          <p className="font-bold text-sm text-[var(--ink)]">
            {selectedConfession.song_name}
          </p>
          <p className="text-[13px] text-[var(--ink-soft)]">
            {selectedConfession.artist_name}
          </p>
        </div>
      )}

      {/* Metadata */}
      <p className="mt-6 text-[13px] font-bold text-[var(--ink-soft)] uppercase tracking-wider z-10 text-center">
        SENT VIA DSSCONFESSIONS • FROM:{" "}
        {selectedConfession.sender_from || "ANONYMOUS"}
      </p>
      <ConfessionFeatures
        key={selectedConfession.id}
        data={selectedConfession}
        onDeleted={onDeleted}
        onPlayReply={(id) => {
          if (/^[A-Za-z0-9]{22}$/.test(id)) setReplyTrack(id);
        }}
      />
    </div>
  );
};

export default DetailsView;
