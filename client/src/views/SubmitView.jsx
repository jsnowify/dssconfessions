import { useRef, useState } from "react";
import { ConfessionCard } from "../components/ui/ConfessionCard";
import Vinyl from "../components/ui/Vinyl";
import Toast from "../components/ui/Toast";
import { useSongSearch } from "../hooks";

const SubmitView = ({ submitConfession, fetchFeed, onPosted }) => {
  const [formData, setFormData] = useState({
    to: "",
    from: "",
    content: "",
    allowReplies: true,
  });
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
  const {
    songSearch,
    setSongSearch,
    songs,
    selectedSong,
    selectSong,
    resetSong,
    isSearching,
    searchError,
    hasSearched,
    minChars,
    retrySearch,
  } = useSongSearch();

  const showToast = (message) => setToast({ show: true, message });
  const closeToast = () => setToast((t) => ({ ...t, show: false }));

  const isFormValid =
    formData.to.trim().length > 0 &&
    formData.content.trim().length > 0 &&
    Boolean(selectedSong);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!formData.to.trim() || !formData.content.trim())
      return showToast(
        "Please fill in the required fields (To and Your words).",
      );
    if (!selectedSong) return showToast("Select a song vibe first! 🎶");

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const receipt = await submitConfession(formData, selectedSong);
      onPosted(receipt.deleteKey);
      setFormData({ to: "", from: "", content: "", allowReplies: true });
      resetSong();
      fetchFeed();
    } catch (e) {
      console.error("Submission Error", e);
      const serverMsg =
        e.response?.data?.error ||
        (Array.isArray(e.response?.data?.details) &&
          e.response.data.details[0]);
      showToast(serverMsg || "Failed to post confession. Please try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const showDropdown =
    !selectedSong &&
    songSearch.trim().length > 0 &&
    (songSearch.trim().length < minChars ||
      isSearching ||
      hasSearched ||
      searchError);

  return (
    <div className="submit-view max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* CONFESSION FORM */}
        <div className="form-crate space-y-6">
          <div className="form-intro">
            <h1 className="text-5xl md:text-6xl font-script font-bold text-[var(--ink)] mb-2">
              Confess
            </h1>
            <p className="text-[var(--ink-soft)] text-[15px]">
              Leave your untold thoughts here. We'll attach your chosen
              soundtrack.
            </p>
          </div>

          {/* Form fields (Fix #6: visible labels, required markers, character counter) */}
          <section className="form-section">
            <h2 className="form-section-title">
              <span>1</span> Who's it for?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TO FIELD */}
              <div>
                <label
                  htmlFor="confession-to"
                  className="block text-[13px] font-bold uppercase tracking-wider text-[var(--ink)] mb-1.5"
                >
                  To <span className="text-[var(--accent-ink)]">*</span>{" "}
                  <span className="font-normal text-[var(--ink-soft)] text-[13px]">
                    Required
                  </span>
                </label>
                <input
                  id="confession-to"
                  className="w-full bg-[var(--sleeve)] border-2 border-[var(--ink)] p-3.5 rounded-xl font-bold text-[var(--ink)] placeholder:text-[var(--ink-soft)]/60 placeholder:font-normal shadow-[4px_4px_0_var(--ink)] focus-visible:outline-none"
                  placeholder="Recipient name"
                  maxLength={50}
                  value={formData.to}
                  onChange={(e) =>
                    setFormData({ ...formData, to: e.target.value })
                  }
                />
              </div>

              {/* FROM FIELD */}
              <div>
                <label
                  htmlFor="confession-from"
                  className="block text-[13px] font-bold uppercase tracking-wider text-[var(--ink)] mb-1.5"
                >
                  From{" "}
                  <span className="font-normal text-[var(--ink-soft)] text-[13px]">
                    Optional
                  </span>
                </label>
                <input
                  id="confession-from"
                  className="w-full bg-[var(--sleeve)] border-2 border-[var(--ink)] p-3.5 rounded-xl font-bold text-[var(--ink)] placeholder:text-[var(--ink-soft)]/60 placeholder:font-normal shadow-[4px_4px_0_var(--ink)] focus-visible:outline-none"
                  placeholder="Leave blank for Anonymous"
                  maxLength={50}
                  value={formData.from}
                  onChange={(e) =>
                    setFormData({ ...formData, from: e.target.value })
                  }
                />
              </div>
            </div>
          </section>
          {/* YOUR WORDS FIELD */}
          <section className="form-section">
            <h2 className="form-section-title">
              <span>2</span> What do you want to say?
            </h2>
            <div className="flex flex-wrap gap-2 justify-between items-center mb-1.5">
              <label
                htmlFor="confession-content"
                className="block text-[13px] font-bold uppercase tracking-wider text-[var(--ink)]"
              >
                Your Words <span className="text-[var(--accent)]">*</span>{" "}
                <span className="font-normal text-[var(--ink-soft)] text-[13px]">
                  Required
                </span>
              </label>
              <span
                className={`form-counter text-[13px] font-bold ${formData.content.length >= 2700 ? "form-counter--near" : ""}`}
              >
                {formData.content.length} / 3000
              </span>
            </div>
            <textarea
              id="confession-content"
              className="w-full bg-[var(--sleeve)] border-2 border-[var(--ink)] p-4 rounded-xl min-h-[176px] max-h-[360px] font-sans text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-soft)]/60 placeholder:font-normal outline-none resize-none shadow-[4px_4px_0_var(--ink)] focus-visible:outline-none no-scrollbar"
              placeholder="Pour out what you never said..."
              maxLength={3000}
              value={formData.content}
              onChange={(e) => {
                setFormData({ ...formData, content: e.target.value });
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 360)}px`;
              }}
            />
          </section>

          {/* SONG SELECTION FIELD */}
          <section className="form-section">
            <h2 className="form-section-title">
              <span>3</span> Pick the song
            </h2>
            <label
              htmlFor={
                selectedSong ? "clear-song-selection" : "song-search-input"
              }
              className="block text-[13px] font-bold uppercase tracking-wider text-[var(--ink)] mb-1.5"
            >
              Song Track <span className="text-[var(--accent)]">*</span>{" "}
              <span className="font-normal text-[var(--ink-soft)] text-[13px]">
                Required
              </span>
            </label>

            {selectedSong ? (
              /* Selected Song Strip */
              <div className="selected-song flex items-center justify-between p-3 bg-[var(--sleeve)] border-2 border-[var(--ink)] rounded-xl shadow-[4px_4px_0_var(--ink)]">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedSong?.album?.images?.[0]?.url ? (
                    <img
                      src={selectedSong.album.images[0].url}
                      className="w-12 h-12 rounded-lg border border-[var(--ink)] object-cover shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-[var(--ink)] bg-[var(--mustard)] flex items-center justify-center shrink-0">
                      <Vinyl size="30px" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-[var(--ink)] truncate">
                      {selectedSong.name}
                    </span>
                    <span className="text-[13px] text-[var(--ink-soft)] truncate">
                      {selectedSong.artists?.[0]?.name ?? "Unknown Artist"}
                    </span>
                  </div>
                </div>
                <button
                  id="clear-song-selection"
                  aria-label="Change selected song"
                  type="button"
                  onClick={resetSong}
                  className="btn btn-paper px-3 py-1.5 text-[13px] font-bold shrink-0 ml-3"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    id="song-search-input"
                    className="w-full bg-[var(--sleeve)] border-2 border-[var(--ink)] p-3.5 rounded-xl font-bold text-[var(--ink)] pr-12 placeholder:text-[var(--ink-soft)]/60 placeholder:font-normal shadow-[4px_4px_0_var(--ink)] focus-visible:outline-none"
                    placeholder="Search Spotify by song title or artist..."
                    value={songSearch}
                    onChange={(e) => setSongSearch(e.target.value)}
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-[var(--ink-soft)] border-t-[var(--ink)] rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {showDropdown && (
                  <div className="song-dropdown no-scrollbar scroll-fade-hints absolute top-full left-0 w-full bg-[var(--sleeve)] border-2 border-[var(--ink)] rounded-xl mt-2 max-h-60 overflow-y-auto z-30 shadow-[4px_4px_0_var(--ink)]">
                    {songSearch.trim().length < minChars ? (
                      <div className="p-4 text-[13px] font-bold text-[var(--ink-soft)] text-center">
                        Keep typing... ({minChars - songSearch.trim().length}{" "}
                        more character
                        {minChars - songSearch.trim().length === 1 ? "" : "s"})
                      </div>
                    ) : isSearching ? (
                      <div className="p-4 flex items-center justify-center gap-3 text-[13px] font-bold text-[var(--ink-soft)]">
                        <div className="w-4 h-4 border-2 border-[var(--ink-soft)] border-t-[var(--ink)] rounded-full animate-spin" />
                        Searching for "{songSearch}"...
                      </div>
                    ) : searchError ? (
                      <div className="p-4 flex flex-col items-center gap-2 text-center">
                        <span className="text-[13px] font-bold text-[var(--accent-ink)]">
                          {searchError}
                        </span>
                        <button
                          type="button"
                          onClick={retrySearch}
                          className="text-[13px] font-bold underline hover:text-[var(--ink)] text-[var(--ink-soft)]"
                        >
                          Try again
                        </button>
                      </div>
                    ) : songs.length === 0 ? (
                      <div className="p-4 text-[13px] font-bold text-[var(--ink-soft)] text-center">
                        No songs found for "{songSearch}". Try another title.
                      </div>
                    ) : (
                      songs.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => selectSong(s)}
                          className="song-option p-3 cursor-pointer flex gap-3 items-center border-b border-[var(--ink)]/15 text-[13px] font-bold "
                        >
                          {s.album?.images?.[0]?.url ? (
                            <img
                              src={s.album.images[0].url}
                              className="w-10 h-10 rounded border border-[var(--ink)] object-cover"
                              alt=""
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[var(--ink)]/10 flex-shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[var(--ink)] truncate">
                              {s.name}
                            </span>
                            <span className="text-[var(--ink-soft)] font-normal truncate">
                              {s.artists?.[0]?.name ?? "Unknown Artist"}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ALLOW SONG REPLIES CUSTOM TOGGLE */}
          <label
            htmlFor="allow-replies-toggle"
            className={`flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] hover:shadow-[4px_4px_0_var(--ink)] hover:-translate-y-0.5 transition-all cursor-pointer select-none focus-within:ring-2 focus-within:ring-[var(--primary)] ${
              formData.allowReplies
                ? "bg-[var(--surface)]"
                : "bg-[var(--bg-wash)]/70"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl border-2 border-[var(--ink)] flex items-center justify-center shrink-0 transition-colors shadow-[2px_2px_0_var(--ink)] ${
                  formData.allowReplies
                    ? "bg-[var(--butter)] text-[var(--ink)]"
                    : "bg-[var(--surface)] text-[var(--ink-soft)]"
                }`}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm md:text-base text-[var(--ink)]">
                    Allow song replies
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--ink)] ${
                      formData.allowReplies
                        ? "bg-[var(--mint)] text-[var(--ink)]"
                        : "bg-[var(--bg-wash)] text-[var(--ink-soft)]"
                    }`}
                  >
                    {formData.allowReplies ? "ON" : "OFF"}
                  </span>
                </div>
                <span className="text-xs text-[var(--ink-soft)]">
                  Let listeners dedicate songs in reply to your confession
                </span>
              </div>
            </div>

            <div className="relative inline-flex items-center shrink-0">
              <input
                id="allow-replies-toggle"
                type="checkbox"
                checked={formData.allowReplies}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    allowReplies: event.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div
                className={`w-12 h-7 rounded-full border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] transition-colors duration-200 relative ${
                  formData.allowReplies
                    ? "bg-[var(--butter)]"
                    : "bg-[var(--bg-wash)]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 border-[var(--ink)] absolute top-[2px] left-[2px] transition-transform duration-200 flex items-center justify-center ${
                    formData.allowReplies
                      ? "translate-x-5 bg-[var(--primary)] text-white"
                      : "translate-x-0 bg-[var(--surface)] text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>
          </label>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={`btn btn-ink w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-transform ${
              !isFormValid || isSubmitting
                ? "opacity-50 cursor-not-allowed shadow-none translate-x-0 translate-y-0"
                : "cursor-pointer"
            }`}
          >
            {isSubmitting ? "Posting to the Mixtape..." : "Post Confession"}
          </button>
        </div>

        {/* LIVE PREVIEW (Fix: reuses real ConfessionCard component) */}
        <div className="preview-panel flex flex-col items-center lg:sticky top-28">
          <span className="preview-label font-bold uppercase tracking-widest mb-6">
            Live Preview
          </span>

          <div className="w-full flex justify-center">
            <ConfessionCard
              isPreview={true}
              data={{
                recipient_to: formData.to,
                sender_from: formData.from,
                content: formData.content,
                song_name: selectedSong?.name,
                album_art: selectedSong?.album?.images?.[0]?.url,
                artist_name: selectedSong?.artists?.[0]?.name,
              }}
            />
          </div>

          <p className="preview-caption font-bold text-center mt-6 uppercase tracking-wider">
            This is exactly how your card will appear in the public feed.
          </p>
          {!formData.allowReplies && (
            <p className="preview-caption mt-2">Song replies turned off</p>
          )}
        </div>
      </div>

      <Toast message={toast.message} show={toast.show} onClose={closeToast} />
    </div>
  );
};

export default SubmitView;
