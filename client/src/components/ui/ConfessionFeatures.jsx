import { useCallback, useEffect, useRef, useState } from "react";
import { useSongSearch } from "../../hooks";
import { featureRequest } from "../../hooks/features";
import Modal from "./Modal";
import ShareDialog from "./ShareDialog";
import Toast from "./Toast";
import Vinyl from "./Vinyl";

const reasons = [
  ["names_me", "This is about me and I want it removed"],
  ["harassment", "Harassment or bullying"],
  ["private_info", "Private or identifying info"],
  ["hate_or_threat", "Hate or threats"],
  ["spam", "Spam"],
  ["other", "Something else"],
];
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function ReportDialog({ target, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const guard = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (guard.current || !reason) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await featureRequest("post", "/api/reports", {
        targetType: target.type,
        targetId: target.id,
        reason,
        details,
      });
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Report this record"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <fieldset>
          <legend className="font-bold mb-3">
            Why are you reporting this?
          </legend>
          {reasons.map(([value, label]) => (
            <label key={value} className="flex items-start gap-3 py-3">
              <input
                type="radio"
                name="report-reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                required
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <label className="block font-bold my-3" htmlFor="report-details">
          Details (optional, 300 characters)
        </label>
        <textarea
          id="report-details"
          className="textarea w-full p-3"
          maxLength={300}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={3}
        />
        <p role="alert" className="feature-error my-3">
          {error}
        </p>
        <button
          className="btn btn-paper w-full py-3"
          type="submit"
          disabled={busy || !reason}
        >
          {busy ? "Sending…" : "Submit report"}
        </button>
      </form>
    </Modal>
  );
}

function AuthorDialog({ id, mode, onClose, onSuccess }) {
  const [key, setKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const guard = useRef(false);
  const deleting = mode === "delete";
  const submit = async (event) => {
    event.preventDefault();
    if (guard.current || (deleting && !confirmed)) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await featureRequest(
        "post",
        `/api/confessions/${id}/${deleting ? "delete" : "author"}`,
        { key },
      );
      onSuccess(key);
    } catch (e) {
      setError(e.message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      title={deleting ? "Delete this confession" : "Author controls"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <p className="mb-4">
          {deleting
            ? "This permanently deletes the confession, its replies and its reports. This cannot be undone."
            : "Enter your confession’s delete key to remove unwanted replies. It stays only in memory until you leave this page."}
        </p>
        <label className="block font-bold mb-2" htmlFor="author-delete-key">
          Delete key
        </label>
        <input
          id="author-delete-key"
          className="input w-full p-3 font-mono"
          type="password"
          autoComplete="off"
          maxLength={32}
          value={key}
          onChange={(event) => setKey(event.target.value)}
          required
        />
        {deleting && (
          <label className="flex items-center gap-3 my-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              required
            />
            I understand this is permanent.
          </label>
        )}
        <p role="alert" className="feature-error my-3">
          {error}
        </p>
        <button
          type="submit"
          className="btn btn-paper w-full py-3"
          disabled={busy || !key.trim() || (deleting && !confirmed)}
        >
          {busy
            ? "Checking…"
            : deleting
              ? "Permanently delete"
              : "Unlock reply controls"}
        </button>
      </form>
    </Modal>
  );
}

function ReplyForm({ id, onSuccess, notify, full }) {
  const song = useSongSearch();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (guard.current || !song.selectedSong || full) return;
    guard.current = true;
    setBusy(true);
    try {
      await featureRequest("post", `/api/confessions/${id}/replies`, {
        song: { id: song.selectedSong.id },
        note,
      });
      song.resetSong();
      setNote("");
      onSuccess();
      notify("Song reply posted.");
    } catch (e) {
      notify(e.message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  return (
    <form className="reply-form mt-6" onSubmit={submit}>
      <label htmlFor="reply-song" className="block font-bold mb-2">
        Song (required)
      </label>
      {song.selectedSong ? (
        <div className="song-strip">
          <div className="song-strip__copy flex-1">
            <strong className="song-title">{song.selectedSong.name}</strong>
            <span className="song-artist">
              {song.selectedSong.artists[0].name}
            </span>
          </div>
          <button
            id="reply-song"
            type="button"
            className="text-action"
            onClick={song.resetSong}
          >
            Change song
          </button>
        </div>
      ) : (
        <input
          id="reply-song"
          className="input w-full p-3"
          placeholder="Search Spotify by title or artist"
          value={song.songSearch}
          onChange={(event) => song.setSongSearch(event.target.value)}
          disabled={busy || full}
        />
      )}
      {song.isSearching && (
        <p role="status" className="mt-3">
          Searching for songs…
        </p>
      )}
      {song.searchError && (
        <div className="mt-3">
          <p role="alert">{song.searchError}</p>
          <button
            type="button"
            className="text-action"
            onClick={song.retrySearch}
          >
            Try song search again
          </button>
        </div>
      )}
      {!song.selectedSong && song.songs.length > 0 && (
        <div className="song-dropdown sleeve-panel mt-2">
          {song.songs.map((item) => (
            <button
              type="button"
              key={item.id}
              className="song-option p-3"
              onClick={() => song.selectSong(item)}
            >
              <strong className="block truncate">{item.name}</strong>
              <span className="block truncate">{item.artists[0].name}</span>
            </button>
          ))}
        </div>
      )}
      {!song.isSearching &&
        !song.searchError &&
        song.hasSearched &&
        song.songs.length === 0 &&
        !song.selectedSong && (
          <p className="mt-3">No songs found. Try another title.</p>
        )}
      <label htmlFor="reply-note" className="block font-bold mt-4 mb-2">
        Note (optional, 140 characters)
      </label>
      <textarea
        id="reply-note"
        className="textarea w-full p-3"
        maxLength={140}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        disabled={busy || full}
      />
      <p className="text-[13px] mt-2">
        {note.length} / 140 · Anonymous. No account required.
      </p>
      <button
        type="submit"
        className="btn btn-paper px-5 mt-4"
        disabled={busy || full || !song.selectedSong}
      >
        {full ? "Reply limit reached" : busy ? "Posting…" : "Post song reply"}
      </button>
    </form>
  );
}

function ReplyItem({ item, onPlay, onReport, onRemove }) {
  const [broken, setBroken] = useState(false);
  return (
    <li className="sleeve-panel p-4">
      <div className="song-strip">
        <button
          type="button"
          className="play-button"
          aria-label={`Play ${item.song_name} by ${item.artist_name}`}
          onClick={() =>
            onPlay(
              item.spotify_track_id ||
                item.spotify_url?.split("/track/")[1]?.split("?")[0],
            )
          }
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        {item.album_art && !broken ? (
          <img
            className="album-thumb"
            src={item.album_art}
            alt=""
            onError={() => setBroken(true)}
            loading="lazy"
          />
        ) : (
          <span className="album-fallback">
            <Vinyl size="30px" />
          </span>
        )}
        <div className="song-strip__copy">
          <strong className="song-title">{item.song_name}</strong>
          <span className="song-artist">{item.artist_name}</span>
        </div>
      </div>
      {item.note && <p className="mt-3 break-words">{item.note}</p>}
      <div className="flex flex-wrap justify-between items-center mt-2 gap-2 text-[13px]">
        <span className="font-mono">
          {dateFormatter.format(new Date(item.created_at))}
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-action"
            onClick={onReport}
            aria-label="Report this reply"
          >
            Report
          </button>
          {onRemove && (
            <button type="button" className="text-action" onClick={onRemove}>
              Remove reply
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ConfessionFeatures({ data, onDeleted, onPlayReply }) {
  const [dialog, setDialog] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [authorKey, setAuthorKey] = useState("");
  const [replies, setReplies] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sequence, setSequence] = useState(0);
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState(false);
  const removeGuard = useRef(false);
  const [removeError, setRemoveError] = useState("");
  const clearNotice = useCallback(() => setNotice(""), []);
  const reload = () => {
    setLoading(true);
    setError("");
    setSequence((value) => value + 1);
  };
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [options, rows] = await Promise.all([
          featureRequest(
            "get",
            `/api/confessions/${data.id}/settings`,
            undefined,
            controller.signal,
          ),
          featureRequest(
            "get",
            `/api/confessions/${data.id}/replies`,
            undefined,
            controller.signal,
          ),
        ]);
        if (!controller.signal.aborted) {
          if (!Array.isArray(rows) || typeof options.allowReplies !== "boolean")
            throw new Error("Reply data is unavailable.");
          setSettings(options);
          setReplies(rows);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [data.id, sequence]);
  const removeReply = async () => {
    if (removeGuard.current) return;
    removeGuard.current = true;
    setRemoving(true);
    setRemoveError("");
    try {
      await featureRequest(
        "post",
        `/api/confessions/${data.id}/replies/${dialog.id}/delete`,
        { key: authorKey },
      );
      setDialog(null);
      reload();
      setNotice("Reply removed.");
    } catch (e) {
      setRemoveError(e.message);
    } finally {
      removeGuard.current = false;
      setRemoving(false);
    }
  };
  const report = (type, id) => {
    setReportTarget({ type, id });
    setDialog("report");
  };
  return (
    <div className="confession-features w-full max-w-2xl mt-8">
      <div className="feature-actions justify-center mb-10">
        <button
          type="button"
          className="btn btn-primary px-8 py-3 font-bold"
          onClick={() => setDialog("share")}
        >
          Share
        </button>
      </div>
      {loading ? (
        <p role="status" className="text-center">
          Loading song replies…
        </p>
      ) : error ? (
        <div role="alert" className="text-center">
          <p>{error}</p>
          <button type="button" className="text-action" onClick={reload}>
            Retry song replies
          </button>
        </div>
      ) : (
        settings?.allowReplies && (
          <section
            className="crate-panel"
            aria-labelledby="song-replies-heading"
          >
            <h2 id="song-replies-heading" className="font-script text-4xl mb-6">
              Reply with a song{" "}
              <span className="text-lg">({replies.length})</span>
            </h2>
            {replies.length ? (
              <ol className="space-y-4">
                {replies.map((item) => (
                  <ReplyItem
                    key={item.id}
                    item={item}
                    onPlay={onPlayReply}
                    onReport={() => report("reply", item.id)}
                    onRemove={
                      authorKey
                        ? () => setDialog({ type: "remove", id: item.id })
                        : undefined
                    }
                  />
                ))}
              </ol>
            ) : (
              <p>No song replies yet. Be the first.</p>
            )}
            <ReplyForm
              id={data.id}
              onSuccess={reload}
              notify={setNotice}
              full={replies.length >= 20}
            />
          </section>
        )
      )}
      <div className="feature-actions justify-center mt-8 text-[13px]">
        <button
          type="button"
          className="text-action"
          aria-label="Report this confession"
          onClick={() => report("confession", data.id)}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 21V3h14l-3 5 3 5H5" />
          </svg>
          Report
        </button>
        <button
          type="button"
          className="text-action"
          onClick={() => setDialog("delete")}
        >
          Delete this confession
        </button>
        {!authorKey && (
          <button
            type="button"
            className="text-action"
            onClick={() => setDialog("author")}
          >
            Author controls
          </button>
        )}
        {authorKey && (
          <button
            type="button"
            className="text-action"
            onClick={() => setAuthorKey("")}
          >
            Lock author controls
          </button>
        )}
      </div>
      {dialog === "share" && (
        <ShareDialog
          data={data}
          onClose={() => setDialog(null)}
          notify={setNotice}
        />
      )}
      {dialog === "report" && (
        <ReportDialog
          target={reportTarget}
          onClose={() => setDialog(null)}
          onSuccess={() => {
            setDialog(null);
            setNotice("Thanks. We'll review it.");
            reload();
          }}
        />
      )}
      {(dialog === "delete" || dialog === "author") && (
        <AuthorDialog
          id={data.id}
          mode={dialog}
          onClose={() => setDialog(null)}
          onSuccess={(key) => {
            setDialog(null);
            if (dialog === "delete") onDeleted();
            else {
              setAuthorKey(key);
              setNotice("Reply controls unlocked for this page.");
            }
          }}
        />
      )}
      {dialog?.type === "remove" && (
        <Modal
          title="Remove this reply?"
          onClose={() => {
            if (!removing) setDialog(null);
          }}
        >
          <p className="mb-4">
            This permanently removes the reply and its reports.
          </p>
          <p role="alert" className="feature-error mb-3">
            {removeError}
          </p>
          <button
            type="button"
            className="btn btn-paper w-full py-3"
            disabled={removing}
            onClick={removeReply}
          >
            {removing ? "Removing…" : "Confirm removal"}
          </button>
        </Modal>
      )}
      <Toast show={Boolean(notice)} message={notice} onClose={clearNotice} />
    </div>
  );
}
