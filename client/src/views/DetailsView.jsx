import { ConfessionCard } from "../components/ui/ConfessionCard";
import { recipientLabel, getSpecialRecipientRole } from "../utils/confession-labels";
import { useState } from "react";
import ShareDialog from "../components/ui/ShareDialog";
import ConfessionFeatures from "../components/ui/ConfessionFeatures";
import ReaderFontToggle from "../components/ui/ReaderFontToggle";

const DetailsView = ({
  selectedConfession,
  onBack,
  fromView = "home",
  isLoading = false,
  error = null,
  onDeleted,
}) => {
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="details-view min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="sr-only">Confession</h1>
        <div className="w-8 h-8 border-2 border-(--ink) border-t-(--mustard) rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-wider text-(--text-soft)">
          Loading confession...
        </p>
      </div>
    );
  }

  if (error || !selectedConfession) {
    return (
      <div className="details-view min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-script font-bold mb-3 text-(--ink)">
          Confession not found
        </h1>
        <p className="text-(--ink-soft) text-base mb-6 max-w-md">
          {error ||
            "This confession might have been removed, or the link may be incorrect."}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-paper px-6 py-2.5 text-button font-bold uppercase tracking-widest cursor-pointer"
        >
          ← {fromView === "browse" ? "Back to Browse" : "Back to Home"}
        </button>
      </div>
    );
  }

  const trackId =
    selectedConfession.spotify_url?.split("/track/")[1]?.split("?")[0];
  const specialRole = getSpecialRecipientRole(selectedConfession?.recipient_to);

  return (
    <div className="details-view min-h-screen flex flex-col items-center px-4 relative pb-20 pt-10">
      {/* Top Navigation & Action Toolbar */}
      <div className="w-full max-w-4xl flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-4 mb-8 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 w-full md:w-auto md:justify-self-start">
          <button
            type="button"
            onClick={onBack}
            className="btn btn-paper px-5 py-2.5 text-button font-bold uppercase tracking-widest cursor-pointer min-h-11"
          >
            ← {fromView === "browse" ? "Back to Browse" : "Back to Home"}
          </button>
          <button
            type="button"
            onClick={() => setIsSaveOpen(true)}
            className="md:hidden btn btn-paper px-5 py-2.5 text-button font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-11"
          >
            Save for IG
          </button>
        </div>

        <div className="w-full md:w-auto flex justify-center md:justify-self-center">
          <ReaderFontToggle variant="toolbar" />
        </div>

        <div className="hidden md:flex md:justify-self-end">
          <button
            type="button"
            onClick={() => setIsSaveOpen(true)}
            className="btn btn-paper px-5 py-2.5 text-button font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-11"
          >
            Save for IG
          </button>
        </div>
      </div>

      {/* Recipient Title (keeping handwriting font) */}
      <div className="text-center mb-8 z-10 px-4 max-w-full">
        <h1 className="text-5xl md:text-7xl font-handwritten text-(--ink) wrap-break-word">
          Hello, {recipientLabel(selectedConfession)}
        </h1>
        {specialRole && (
          <div className="mt-3 flex justify-center">
            <span
              className={`special-role-tag special-role-tag--lg ${specialRole.className}`}
              title={specialRole.title}
            >
              <span aria-hidden="true">{specialRole.icon}</span>
              <span>{specialRole.label}</span>
            </span>
          </div>
        )}
      </div>

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
        <div className="w-full max-w-112.5 shadow-[6px_6px_0_var(--ink)] rounded-xl border-2 border-(--ink) overflow-hidden bg-(--surface) z-10 mb-8">
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
        <div className="w-full max-w-112.5 p-6 bg-(--sleeve) border-2 border-(--ink) rounded-xl text-center mb-8 z-10 shadow-[4px_4px_0_var(--ink)]">
          <p className="font-bold text-sm text-(--ink)">
            {selectedConfession.song_name}
          </p>
          <p className="text-meta text-(--ink-soft)">
            {selectedConfession.artist_name}
          </p>
        </div>
      )}

      {/* Metadata */}
      <p className="mt-6 text-meta font-bold text-(--ink-soft) uppercase tracking-wider z-10 text-center">
        SENT VIA DSSCONFESSIONS • FROM:{" "}
        {selectedConfession.sender_from || "ANONYMOUS"}
      </p>
      <ConfessionFeatures
        key={selectedConfession.id}
        data={selectedConfession}
        onDeleted={onDeleted}
      />
      {isSaveOpen && (
        <ShareDialog
          data={selectedConfession}
          initialHeight={1920}
          onClose={() => setIsSaveOpen(false)}
        />
      )}
    </div>
  );
};

export default DetailsView;
