import React, { useEffect, useRef, useState } from "react";
import Vinyl from "./Vinyl";
import Doodle from "./Doodle";
import PokeButton from "./PokeButton";
import { cardPastel } from "../../utils/pastel";
import { recipientLabel, getSpecialRecipientRole } from "../../utils/confession-labels";

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
      // These cards already show Read more; measuring their clamped text only
      // adds a layout read and observer callback for every feed/search result.
      if (full || isExpanded || content.length > 120 || content.split("\n").length > 3) return;
      const node = messageRef.current;
      if (!node) return;
      const observer = new ResizeObserver(() =>
        setHasOverflow(node.scrollHeight > node.clientHeight + 1),
      );
      observer.observe(node);
      return () => observer.disconnect();
    }, [content, isExpanded, full]);
    const songTitle =
      data?.song_name || (isPreview ? "Choose a soundtrack" : "Untitled Track");
    const artistName =
      data?.artist_name ||
      (isPreview ? "Spotify search required" : "Unknown artist");
    const date = new Date(data?.created_at);
    const dateLabel = Number.isNaN(date.getTime())
      ? ""
      : dateFormatter.format(date);
    const specialRole = getSpecialRecipientRole(data?.recipient_to);
    const replyCount = Math.max(0, Number(data?.reply_count) || 0);
    const handleCardClick = () => {
      if (!isPreview && onClick) onClick();
    };

    return (
      <article
        style={{ "--tile": cardPastel(data.id) }}
        className={`record-card ${isPreview ? "record-card--preview" : ""} ${full ? "record-card--full" : ""}`}
      >
        <div className="record-card__clip">
          <div
            className="card record-card__face text-left"
            onClick={handleCardClick}
          >
            <header className="record-card__header flex-wrap">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                <span
                  className="tag-to font-bold uppercase tracking-wider"
                  title={recipientLabel(data) || "......"}
                >
                  <Doodle kind="note" />
                  <span className="truncate">
                    To: {recipientLabel(data) || "......"}
                  </span>
                </span>
                {specialRole && (
                  <span
                    className={`special-role-tag ${specialRole.className}`}
                    title={specialRole.title}
                  >
                    <span aria-hidden="true">{specialRole.icon}</span>
                    <span>{specialRole.label}</span>
                  </span>
                )}
              </div>
              <span className="record-date shrink-0">
                {isPreview ? "PREVIEW" : dateLabel}
              </span>
            </header>
            <div className="record-message">
              <p
                ref={messageRef}
                className={`read-text whitespace-pre-line ${!isExpanded && !full ? "line-clamp-5" : ""}`}
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
              <footer className="record-card__footer uppercase tracking-wider flex items-center justify-between gap-2">
                <span className="truncate max-w-45">
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
              {!isPreview && replyCount > 0 && (
                <button
                  type="button"
                  className="reply-badge"
                  aria-label={`${replyCount} ${replyCount === 1 ? "song reply" : "song replies"}. Open tracklist`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (full) document.getElementById("song-tracklist")?.scrollIntoView({
                      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
                      block: "start",
                    });
                    else onClick?.();
                  }}
                >
                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
                    <path d="M12 8v6m0-6 3-1v6" />
                    <path d="M12 14c0 1-3 1.5-3 0s3-1.5 3 0Zm3-1c0 1 3 .5 3-1s-3 0-3 1Z" />
                  </svg>
                  <span>{replyCount} {replyCount === 1 ? "song reply" : "song replies"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  },
);
