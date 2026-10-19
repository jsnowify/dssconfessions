import React, { useEffect, useRef, useState } from "react";
import Vinyl from "./Vinyl";
import Doodle from "./Doodle";
import PokeButton from "./PokeButton";
import { cardPastel } from "../../utils/pastel";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const ConfessionCard = React.memo(
  ({ data = {}, onClick, isPreview = false, full = false, onToast }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [failedImage, setFailedImage] = useState(null);
    const [hasOverflow, setHasOverflow] = useState(false);
    const messageRef = useRef(null);
    const content = data?.content || "";
    const isLongContent =
      content.length > 120 ||
      content.split("\n").length > 3 ||
      hasOverflow ||
      isExpanded;
    useEffect(() => {
      const node = messageRef.current;
      if (!node) return;
      const observer = new ResizeObserver(() =>
        setHasOverflow(node.scrollHeight > node.clientHeight + 1),
      );
      observer.observe(node);
      return () => observer.disconnect();
    }, [content, isExpanded]);
    const songTitle =
      data?.song_name || (isPreview ? "Choose a soundtrack" : "Untitled Track");
    const artistName =
      data?.artist_name ||
      (isPreview ? "Spotify search required" : "Unknown artist");
    const date = new Date(data?.created_at);
    const dateLabel = Number.isNaN(date.getTime())
      ? ""
      : dateFormatter.format(date);
    const handleCardClick = () => {
      if (!isPreview && onClick) onClick();
    };

    return (
      <article
        style={{ "--tile": cardPastel(data.id) }}
        className={`record-card ${isPreview ? "record-card--preview" : ""} ${full ? "record-card--full" : ""}`}
      >
        {(data.is_automated || data.content?.startsWith("[Automated fiction]")) && <p className="automation-label">Automated fiction · Not a real student story</p>}
        <div className="record-card__clip">
          <div
            className="card record-card__face text-left"
            onClick={handleCardClick}
          >
            <header className="record-card__header">
              <span
                className="tag-to font-bold uppercase tracking-wider"
                title={data?.recipient_to || "......"}
              >
                <Doodle kind="note" />
                <span className="truncate">
                  To: {data?.recipient_to || "......"}
                </span>
              </span>
              <span className="record-date font-mono">
                {isPreview ? "PREVIEW" : dateLabel}
              </span>
            </header>
            <div className="record-message">
              <p
                ref={messageRef}
                className={`font-handwritten text-2xl md:text-3xl whitespace-pre-line ${!isExpanded && !full ? "line-clamp-5" : ""}`}
              >
                &quot;{content || "Your untold words..."}&quot;
              </p>
              {isLongContent && !full && (
                <button
                  type="button"
                  className="read-more font-bold"
                  aria-expanded={isExpanded}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  {isExpanded ? "Show less ↑" : "Read more →"}
                </button>
              )}
            </div>
            <div className="record-card__bottom">
              <div className="song-strip">
                <button
                  type="button"
                  className="play-button"
                  aria-label={`Play ${songTitle} by ${artistName}`}
                  title="Open music player"
                  disabled={isPreview || !onClick}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onClick) onClick();
                  }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <span className="album-wrap">
                  <span className="album-vinyl">
                    <Vinyl size="32px" />
                  </span>
                  {data?.album_art && failedImage !== data.album_art ? (
                    <img
                      src={data.album_art}
                      alt=""
                      loading="lazy"
                      className="album-thumb"
                      onError={() => setFailedImage(data.album_art)}
                    />
                  ) : (
                    <span className="album-fallback">
                      <Vinyl size="30px" label="var(--pink)" />
                    </span>
                  )}
                </span>
                <div className="song-strip__copy">
                  <span className="song-title font-bold" title={songTitle}>
                    {songTitle}
                  </span>
                  <span className="song-artist" title={artistName}>
                    {artistName}
                  </span>
                </div>
              </div>
              <footer className="record-card__footer font-mono uppercase tracking-wider flex items-center justify-between gap-2">
                <span className="truncate max-w-[180px]">
                  from: {data?.sender_from || "Anonymous"}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PokeButton
                    confessionId={data?.id}
                    initialCount={data?.poke_count}
                    isPreview={isPreview}
                    onToast={onToast}
                  />
                  {isPreview && <span>mixtape</span>}
                </div>
              </footer>
            </div>
          </div>
        </div>
      </article>
    );
  },
);
