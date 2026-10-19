import { useState, useRef, useEffect } from "react";
import { useSongSearch } from "../../hooks";
import Vinyl from "./Vinyl";

const PASTEL_COLORS = [
  "var(--sky)",
  "var(--mint)",
  "var(--lilac)",
  "var(--peach)",
  "var(--butter)",
  "var(--pink)",
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function extractTrackId(spotifyUrl) {
  if (!spotifyUrl) return null;
  const match = spotifyUrl.match(/\/track\/([A-Za-z0-9]{22})/);
  return match ? match[1] : null;
}

export default function SongTracklist({
  replies = [],
  meta = null,
  allowReplies = true,
  loading = false,
  error = null,
  onRetry,
  onReportReply,
  onDeleteReply,
  onPostReply,
  authorKey = "",
  onUnlockAuthor,
  onLockAuthor,
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [brokenImages, setBrokenImages] = useState({});
  const [visibleCount, setVisibleCount] = useState(25);
  const [activeTrackId, setActiveTrackId] = useState(null);

  const song = useSongSearch();
  const searchInputRef = useRef(null);
  const submitGuardRef = useRef(false);

  const count = meta?.count ?? replies.length;
  const max = meta?.max ?? 500;
  const meterSegments = Math.min(max, 10);
  const canReply = meta?.canReply ?? (allowReplies && count < max);
  const spotsLeft = Math.max(0, max - count);

  // Focus search input when composer opens
  useEffect(() => {
    if (composerOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [composerOpen]);

  const handleOpenComposer = () => {
    setComposerOpen(true);
    setSubmitError("");
  };

  const handleCancelComposer = () => {
    setComposerOpen(false);
    song.resetSong();
    setNote("");
    setSubmitError("");
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (submitGuardRef.current || !song.selectedSong || !canReply) return;

    submitGuardRef.current = true;
    setSubmitting(true);
    setSubmitError("");

    try {
      await onPostReply({
        song: { id: song.selectedSong.id },
        note: note.trim() || undefined,
      });
      // Reset form on success
      song.resetSong();
      setNote("");
      setComposerOpen(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to post song reply.");
    } finally {
      submitGuardRef.current = false;
      setSubmitting(false);
    }
  };

  const handleImageError = (replyId) => {
    setBrokenImages((prev) => ({ ...prev, [replyId]: true }));
  };

  // Micro-copy generation
  let statusMicroCopy = "";
  if (!allowReplies) {
    statusMicroCopy = "Song replies are turned off for this confession.";
  } else if (count >= max) {
    statusMicroCopy = `This mixtape is full (${count}/${max} songs)`;
  } else if (spotsLeft === 1) {
    statusMicroCopy = "Last spot! Make it count.";
  } else if (spotsLeft <= 4) {
    statusMicroCopy = `Only ${spotsLeft} spots left — pick the right song`;
  } else {
    statusMicroCopy = `${spotsLeft} spots left on this mixtape`;
  }

  const nextTrackNum = String(count + 1).padStart(2, "0");
  const nextTrackColor = PASTEL_COLORS[count % PASTEL_COLORS.length];

  return (
    <section
      className="song-tracklist w-full bg-(--bg-wash) border-2 border-(--ink) rounded-2xl p-5 md:p-6 shadow-[4px_4px_0_var(--ink)] mt-8"
      aria-labelledby="tracklist-heading"
    >
      {/* Tracklist Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-(--ink)">
        <div>
          <h2
            id="tracklist-heading"
            className="font-script text-3xl md:text-4xl font-bold text-(--ink)"
          >
            Mixtape tracklist
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <p className="text-xs text-(--ink-soft)">
              {statusMicroCopy}
            </p>
            {!authorKey && onUnlockAuthor && count > 0 && (
              <button
                type="button"
                className="text-xs text-(--ink-soft) hover:text-(--ink) underline cursor-pointer"
                onClick={onUnlockAuthor}
              >
                Author? Manage replies
              </button>
            )}
          </div>
        </div>

        {/* Compact capacity meter, independent of the number of reply slots. */}
        <div
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl border-2 border-(--ink) bg-(--surface) shadow-[2px_2px_0_var(--ink)] self-start sm:self-auto"
          role="img"
          aria-label={`${count} of ${max} reply slots filled`}
        >
          {Array.from({ length: meterSegments }).map((_, idx) => {
            const isFilled = idx < Math.ceil((count / max) * meterSegments);
            return (
              <span
                key={idx}
                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                  isFilled
                    ? "bg-(--ink) border border-(--ink)"
                    : "border-2 border-dashed border-(--ink-soft) bg-transparent opacity-50"
                }`}
                aria-hidden="true"
              >
                {isFilled && (
                  <span className="w-1 h-1 rounded-full bg-(--pink)" />
                )}
              </span>
            );
          })}
          <span
            className="text-xs font-bold whitespace-nowrap"
            aria-hidden="true"
          >
            {count}/{max}
          </span>
        </div>
      </div>

      {/* Author Management Banner (when unlocked) */}
      {authorKey && (
        <div className="mt-4 p-3 rounded-xl border-2 border-(--ink) bg-(--butter) flex items-center justify-between gap-3 shadow-[2px_2px_0_var(--ink)]">
          <div className="flex items-center gap-2 text-xs font-bold text-(--ink)">
            <span aria-hidden="true">🔑</span>
            <span>
              Managing replies as author — click Remove on any track to delete
              it.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-paper text-xs py-1 px-3 uppercase tracking-wider font-bold cursor-pointer"
            onClick={onLockAuthor}
          >
            Lock again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          className="py-8 space-y-4"
          role="status"
          aria-label="Loading tracklist"
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 rounded-xl border-2 border-(--ink) bg-(--surface) animate-pulse flex items-center gap-4 opacity-75"
            >
              <div className="w-8 h-8 rounded-lg bg-(--ink-soft)/20" />
              <div className="w-12 h-12 rounded-lg bg-(--ink-soft)/20" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-(--ink-soft)/20 rounded w-1/3" />
                <div className="h-3 bg-(--ink-soft)/10 rounded w-1/4" />
              </div>
            </div>
          ))}
          <p className="sr-only">Loading tracklist...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="py-8 text-center" role="alert">
          <p className="text-sm font-bold text-(--coral) mb-3">{error}</p>
          <button
            type="button"
            className="btn btn-paper px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
            onClick={onRetry}
          >
            Retry loading tracklist
          </button>
        </div>
      )}

      {/* Tracklist Rows & Composer */}
      {!loading && !error && (
        <div className="mt-5 space-y-3">
          {/* Empty State Banner (0 replies) */}
          {count === 0 && (
            <div className="p-4 rounded-xl border-2 border-dashed border-(--ink-soft) bg-white/50 text-center mb-3">
              <p className="font-script text-2xl text-(--ink) font-bold mb-1">
                No songs on this mixtape yet!
              </p>
              <p className="text-xs text-(--ink-soft)">
                Track 01 is waiting for you. Choose a song to start the
                tracklist.
              </p>
            </div>
          )}

          {/* Rendered Tracks */}
          <ol className="space-y-3">
            {replies.slice(0, visibleCount).map((item, index) => {
              const trackNum = String(index + 1).padStart(2, "0");
              const trackColor = PASTEL_COLORS[index % PASTEL_COLORS.length];
              const rawSpotifyId =
                item.spotify_track_id || extractTrackId(item.spotify_url);
              const spotifyId =
                typeof rawSpotifyId === "string" &&
                /^[A-Za-z0-9]{22}$/.test(rawSpotifyId.trim())
                  ? rawSpotifyId.trim()
                  : null;
              const isBroken = brokenImages[item.id];
              const isActive = activeTrackId === item.id;

              return (
                <li
                  key={item.id}
                  className={`p-3.5 md:p-4 rounded-xl border-2 border-(--ink) bg-(--surface) shadow-[2px_2px_0_var(--ink)] transition-all ${
                    isActive ? "reply-track--active" : "hover:-translate-y-0.5"
                  }`}
                >
                  {/* Equalizer Soundwave Accent Strip along the top of active card */}
                  {isActive && (
                    <div className="audio-wave-strip mb-3" aria-hidden="true">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <span
                          key={i}
                          className="audio-wave-pip"
                          style={{
                            animationDelay: `${(i * 0.08) % 0.8}s`,
                            backgroundColor:
                              PASTEL_COLORS[i % PASTEL_COLORS.length],
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 md:gap-4">
                    {/* Track Number Badge */}
                    <span
                      className="w-8 h-8 rounded-lg border-2 border-(--ink) font-bold text-xs flex items-center justify-center shrink-0 shadow-[1px_1px_0_var(--ink)]"
                      style={{ backgroundColor: trackColor }}
                    >
                      {trackNum}
                    </span>

                    {/* Album Art */}
                    <div className="w-12 h-12 rounded-lg border-2 border-(--ink) overflow-hidden shrink-0 bg-(--bg-wash) flex items-center justify-center">
                      {item.album_art && !isBroken ? (
                        <img
                          src={item.album_art}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={() => handleImageError(item.id)}
                        />
                      ) : (
                        <Vinyl size="28px" />
                      )}
                    </div>

                    {/* Song & Artist Info */}
                    <div className="flex-1 min-w-0">
                      <strong className="block text-sm font-bold text-(--ink) truncate">
                        {item.song_name}
                      </strong>
                      <span className="block text-xs text-(--ink-soft) truncate">
                        {item.artist_name}
                      </span>
                    </div>

                    {/* Play / Equalizer Button */}
                    <button
                      type="button"
                      className={`w-11 h-11 min-w-11 min-h-11 rounded-full border-2 border-(--ink) flex items-center justify-center cursor-pointer shrink-0 transition-transform active:translate-y-0.5 shadow-[2px_2px_0_var(--ink)] ${
                        isActive
                          ? "bg-(--butter) text-(--ink) ring-2 ring-(--ink)"
                          : "bg-(--surface) hover:bg-(--butter)"
                      }`}
                      aria-label={
                        isActive
                          ? `Close player for ${item.song_name}`
                          : `Play ${item.song_name} by ${item.artist_name}`
                      }
                      aria-pressed={isActive}
                      onClick={() => {
                        const next = isActive ? null : item.id;
                        setActiveTrackId(next);
                      }}
                    >
                      {isActive ? (
                        <div className="eq-bars" aria-hidden="true">
                          <span className="eq-bar" />
                          <span className="eq-bar" />
                          <span className="eq-bar" />
                          <span className="eq-bar" />
                        </div>
                      ) : (
                        <svg
                          aria-hidden="true"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="text-(--ink) ml-0.5"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Optional Note (Liner-note / Tape sticker) */}
                  {item.note && (
                    <div className="mt-3 p-2.5 rounded-lg border-2 border-(--ink) bg-(--bg-wash) text-body-sm text-(--ink) wrap-break-word shadow-[1px_1px_0_var(--ink)] relative">
                      <span className="font-bold mr-1 text-(--ink-soft)">
                        Note:
                      </span>
                      <span className="read-text">{item.note}</span>
                    </div>
                  )}

                  {/* Inline Audio Player for this Reply */}
                  {isActive && spotifyId && (
                    <div className="mt-3.5 pt-3 border-t-2 border-(--ink)/15">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-meta font-bold flex items-center gap-1.5 text-(--ink)">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-(--mint) border border-(--ink) animate-pulse" />
                          Now Playing Reply • Track {trackNum}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTrackId(null)}
                          className="text-meta text-(--ink-soft) hover:text-(--ink) underline font-bold cursor-pointer"
                        >
                          ✕ Close
                        </button>
                      </div>
                      <div className="rounded-xl border-2 border-(--ink) overflow-hidden shadow-[3px_3px_0_var(--ink)] bg-(--surface)">
                        <iframe
                          src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`}
                          width="100%"
                          height="80"
                          frameBorder="0"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          title={`Spotify Player for ${item.song_name}`}
                          className="block w-full"
                        />
                      </div>
                    </div>
                  )}

                  {isActive && !spotifyId && item.spotify_url && (
                    <div className="mt-3.5 pt-3 border-t-2 border-(--ink)/15 text-center">
                      <a
                        href={item.spotify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-paper inline-flex items-center gap-2 px-4 py-2 text-button font-bold"
                      >
                        Listen on Spotify ↗
                      </a>
                    </div>
                  )}

                  {/* Metadata & Actions */}
                  <div className="mt-2.5 flex items-center justify-between text-meta text-(--ink-soft) pt-1">
                    <span>
                      {dateFormatter.format(new Date(item.created_at))}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="underline hover:text-(--primary) font-bold cursor-pointer"
                        onClick={() => onReportReply(item.id)}
                        aria-label="Report this reply"
                      >
                        Report
                      </button>
                      {authorKey && (
                        <button
                          type="button"
                          className="font-bold text-(--coral) underline hover:opacity-80 cursor-pointer"
                          onClick={() => onDeleteReply(item.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {visibleCount < replies.length && (
            <button
              type="button"
              className="btn btn-paper min-h-11"
              onClick={() => setVisibleCount((value) => value + 25)}
            >
              Show more songs ({Math.min(visibleCount, replies.length)} of{" "}
              {replies.length})
            </button>
          )}

          {/* Composer Slot (First open slot) */}
          {canReply && (
            <div className="mt-3">
              {!composerOpen ? (
                /* Collapsed Trigger Button */
                <button
                  type="button"
                  className="w-full text-left border-2 border-dashed border-(--ink) rounded-xl p-3.5 bg-white/70 hover:bg-white transition-all shadow-[2px_2px_0_var(--ink)] flex items-center justify-between gap-3 min-h-12 cursor-pointer group"
                  onClick={handleOpenComposer}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-lg border-2 border-(--ink) font-bold text-xs flex items-center justify-center shrink-0 shadow-[1px_1px_0_var(--ink)]"
                      style={{ backgroundColor: nextTrackColor }}
                    >
                      {nextTrackNum}
                    </span>
                    <span className="font-bold text-sm text-(--ink) group-hover:underline">
                      + Add your song (track {nextTrackNum})
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full border-2 border-(--ink) bg-(--butter) text-xs font-bold text-(--ink) shadow-[1px_1px_0_var(--ink)]">
                    + Add song
                  </span>
                </button>
              ) : (
                /* Expanded Inline Composer */
                <form
                  className="p-4 rounded-xl border-2 border-(--ink) bg-(--surface) shadow-[3px_3px_0_var(--ink)]"
                  onSubmit={handleSubmitReply}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-(--ink)/20 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg border-2 border-(--ink) font-bold text-xs flex items-center justify-center shrink-0 shadow-[1px_1px_0_var(--ink)]"
                        style={{ backgroundColor: nextTrackColor }}
                      >
                        {nextTrackNum}
                      </span>
                      <h3 className="font-bold text-sm text-(--ink)">
                        Add track {nextTrackNum}
                      </h3>
                    </div>
                    <span className="text-xs text-(--ink-soft)">
                      {note.length} / 140
                    </span>
                  </div>

                  {/* Song Selection */}
                  <label
                    htmlFor="tracklist-song-search"
                    className="block text-xs font-bold uppercase tracking-wider text-(--ink) mb-1.5"
                  >
                    Choose a song (required)
                  </label>

                  {song.selectedSong ? (
                    /* Selected Song Strip */
                    <div className="p-3 rounded-xl border-2 border-(--ink) bg-(--bg-wash) flex items-center justify-between gap-3 mb-3 shadow-[1px_1px_0_var(--ink)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg border border-(--ink) bg-white overflow-hidden shrink-0 flex items-center justify-center">
                          {song.selectedSong.album?.images?.[0]?.url ? (
                            <img
                              src={song.selectedSong.album.images[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Vinyl size="24px" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-sm font-bold text-(--ink) truncate">
                            {song.selectedSong.name}
                          </strong>
                          <span className="block text-xs text-(--ink-soft) truncate">
                            {song.selectedSong.artists[0]?.name}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-paper text-xs py-1.5 px-3 font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                        onClick={song.resetSong}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    /* Search Input & Results */
                    <div className="relative mb-3">
                      <input
                        ref={searchInputRef}
                        id="tracklist-song-search"
                        className="input w-full p-3 font-sans text-sm border-2 border-(--ink) rounded-xl shadow-[2px_2px_0_var(--ink)]"
                        placeholder="Search Spotify by song title or artist..."
                        value={song.songSearch}
                        onChange={(e) => song.setSongSearch(e.target.value)}
                        disabled={submitting}
                      />
                      {song.isSearching && (
                        <p
                          role="status"
                          className="text-xs text-(--ink-soft) mt-1.5"
                        >
                          Searching Spotify…
                        </p>
                      )}
                      {song.searchError && (
                        <div className="mt-2 text-xs text-(--coral)">
                          <span>{song.searchError}</span>
                          <button
                            type="button"
                            className="ml-2 underline font-bold"
                            onClick={song.retrySearch}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {/* Search Results Dropdown */}
                      {!song.selectedSong && song.songs.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto bg-(--surface) border-2 border-(--ink) rounded-xl shadow-[4px_4px_0_var(--ink)] no-scrollbar">
                          {song.songs.map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              className="w-full text-left p-3 hover:bg-(--bg-wash) border-b border-(--ink)/10 last:border-b-0 flex items-center justify-between gap-3 cursor-pointer"
                              onClick={() => song.selectSong(item)}
                            >
                              <div className="min-w-0">
                                <strong className="block text-sm font-bold text-(--ink) truncate">
                                  {item.name}
                                </strong>
                                <span className="block text-xs text-(--ink-soft) truncate">
                                  {item.artists[0]?.name}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-(--primary) shrink-0">
                                Select
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {!song.isSearching &&
                        !song.searchError &&
                        song.hasSearched &&
                        song.songs.length === 0 &&
                        !song.selectedSong && (
                          <p className="text-xs text-(--ink-soft) mt-1.5">
                            No songs found. Try a different search term.
                          </p>
                        )}
                    </div>
                  )}

                  {/* Note Field */}
                  <label
                    htmlFor="tracklist-note"
                    className="block text-xs font-bold uppercase tracking-wider text-(--ink) mb-1.5"
                  >
                    Short note (optional, 140 characters)
                  </label>
                  <textarea
                    id="tracklist-note"
                    className="textarea w-full p-3 font-sans text-sm border-2 border-(--ink) rounded-xl shadow-[2px_2px_0_var(--ink)] resize-none"
                    maxLength={140}
                    rows={2}
                    placeholder="Leave a friendly note or lyric..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={submitting}
                  />

                  {/* Submission Error Alert */}
                  {submitError && (
                    <p
                      role="alert"
                      className="feature-error mt-2 text-xs font-bold text-(--coral)"
                    >
                      {submitError}
                    </p>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-between gap-3 mt-4">
                    <button
                      type="button"
                      className="btn btn-paper px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                      onClick={handleCancelComposer}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      disabled={submitting || !song.selectedSong}
                    >
                      {submitting ? "Sending reply…" : "Send reply"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Remaining Open Slot Placeholders */}
          {canReply && spotsLeft > 1 && (
            <div className="space-y-2 pt-1">
              {/* Show up to 2 empty dashed outline slots */}
              {Array.from({ length: Math.min(2, spotsLeft - 1) }).map(
                (_, idx) => {
                  const slotIndex = count + 1 + idx;
                  const slotNum = String(slotIndex + 1).padStart(2, "0");
                  return (
                    <div
                      key={slotIndex}
                      className="p-3 rounded-xl border-2 border-dashed border-(--ink-soft)/40 bg-white/30 flex items-center gap-3 opacity-60"
                    >
                      <span className="w-7 h-7 rounded-lg border-2 border-dashed border-(--ink-soft) font-bold text-xs flex items-center justify-center shrink-0 text-(--ink-soft)">
                        {slotNum}
                      </span>
                      <span className="text-xs text-(--ink-soft)">
                        Slot {slotNum} · Waiting for a song...
                      </span>
                    </div>
                  );
                },
              )}

              {/* Summary pill if more than 3 total empty slots */}
              {spotsLeft > 3 && (
                <div className="text-center py-2 px-3 rounded-lg border border-dashed border-(--ink-soft)/40 bg-white/20 text-xs font-medium text-(--ink-soft)">
                  + {spotsLeft - 3} more open spots on this mixtape
                </div>
              )}
            </div>
          )}

          {/* Full State Banner */}
          {count >= max && (
            <div className="p-4 rounded-xl border-2 border-(--ink) bg-(--surface) text-center shadow-[2px_2px_0_var(--ink)]">
              <span className="inline-block px-3 py-1 rounded-full bg-(--mint) border-2 border-(--ink) text-xs font-bold text-(--ink) mb-2 shadow-[1px_1px_0_var(--ink)]">
                Tracklist Complete
              </span>
              <p className="text-sm font-bold text-(--ink) mb-1">
                This mixtape is full ({count}/{max} songs).
              </p>
              <p className="text-xs text-(--ink-soft)">
                The confession author can remove tracks using their delete key
                to free up spots.
              </p>
            </div>
          )}

          {/* Disabled State Banner */}
          {!allowReplies && (
            <div className="p-4 rounded-xl border-2 border-dashed border-(--ink-soft) bg-white/40 text-center">
              <p className="text-xs text-(--ink-soft)">
                Song replies are turned off for this confession.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
