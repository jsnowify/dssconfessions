import { useCallback, useEffect, useRef, useState } from "react";
import { featureRequest } from "../../hooks/features";
import Modal from "./Modal";
import ShareDialog from "./ShareDialog";
import Toast from "./Toast";
import SongTracklist from "./SongTracklist";

const reasons = [
  ["names_me", "This is about me and I want it removed"],
  ["harassment", "Harassment or bullying"],
  ["private_info", "Private or identifying info"],
  ["hate_or_threat", "Hate or threats"],
  ["spam", "Spam"],
  ["other", "Something else"],
];

const REPORTED_STORAGE_KEY = "dssc_reported_targets";

function getReportedTargets() {
  try {
    const raw = localStorage.getItem(REPORTED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function hasAlreadyReported(type, id) {
  try {
    const list = getReportedTargets();
    return list.includes(`${type}:${id}`);
  } catch {
    return false;
  }
}

function markTargetAsReported(type, id) {
  try {
    const list = getReportedTargets();
    const key = `${type}:${id}`;
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem(REPORTED_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    /* Ignore storage limits or private browsing restrictions */
  }
}

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

    // Shadow rate limit: if user already submitted a report for this target,
    // simulate network delay and succeed in UI without hitting backend.
    if (hasAlreadyReported(target.type, target.id)) {
      setTimeout(() => {
        guard.current = false;
        setBusy(false);
        onSuccess();
      }, 400);
      return;
    }

    try {
      await featureRequest("post", "/api/reports", {
        targetType: target.type,
        targetId: target.id,
        reason,
        details,
      });
      markTargetAsReported(target.type, target.id);
      onSuccess();
    } catch (e) {
      // If server returned rate limit (429), shadow-succeed in the UI
      if (e?.message && /too many|wait|slow down/i.test(e.message)) {
        markTargetAsReported(target.type, target.id);
        onSuccess();
      } else {
        setError(e.message);
      }
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

export default function ConfessionFeatures({ data, onDeleted, onPlayReply }) {
  const [dialog, setDialog] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [authorKey, setAuthorKey] = useState("");
  const [replies, setReplies] = useState([]);
  const [meta, setMeta] = useState(null);
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
        const [options, res] = await Promise.all([
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
          const list = Array.isArray(res) ? res : res?.replies || [];
          const resMeta = res?.meta || {
            count: list.length,
            max: 10,
            canReply: options?.allowReplies && list.length < 10,
            reason: !options?.allowReplies
              ? "disabled"
              : list.length >= 10
                ? "full"
                : null,
          };
          setSettings(options);
          setReplies(list);
          setMeta(resMeta);
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

  const handlePostReply = async (payload) => {
    const res = await featureRequest(
      "post",
      `/api/confessions/${data.id}/replies`,
      payload,
    );
    if (res?.reply) {
      setReplies((prev) => [...prev, res.reply]);
      if (res?.meta) setMeta(res.meta);
    } else {
      reload();
    }
    setNotice("Song reply posted.");
  };

  const removeReply = async () => {
    if (removeGuard.current) return;
    removeGuard.current = true;
    setRemoving(true);
    setRemoveError("");
    try {
      const res = await featureRequest(
        "post",
        `/api/confessions/${data.id}/replies/${dialog.id}/delete`,
        { key: authorKey },
      );
      const targetId = dialog.id;
      setDialog(null);
      if (res?.meta) {
        setReplies((prev) => prev.filter((r) => r.id !== targetId));
        setMeta(res.meta);
      } else {
        reload();
      }
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
      {/* Primary Action Button */}
      <div className="feature-actions justify-center mb-6">
        <button
          type="button"
          className="btn btn-primary px-8 py-3 font-bold"
          onClick={() => setDialog("share")}
        >
          Share
        </button>
      </div>

      {/* Mixtape Tracklist */}
      <SongTracklist
        confessionId={data.id}
        replies={replies}
        meta={meta}
        allowReplies={settings?.allowReplies ?? true}
        loading={loading}
        error={error}
        onRetry={reload}
        onPlayReply={onPlayReply}
        onReportReply={(replyId) => report("reply", replyId)}
        onDeleteReply={(replyId) => setDialog({ type: "remove", id: replyId })}
        onPostReply={handlePostReply}
        authorKey={authorKey}
        onUnlockAuthor={() => setDialog("author")}
        onLockAuthor={() => setAuthorKey("")}
      />

      {/* Auxiliary Actions Strip */}
      <div className="feature-actions justify-center mt-8 text-meta">
        <button
          type="button"
          className="text-action flex items-center gap-1.5"
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
        {!authorKey ? (
          <button
            type="button"
            className="text-action"
            onClick={() => setDialog("author")}
          >
            Author controls
          </button>
        ) : (
          <button
            type="button"
            className="text-action"
            onClick={() => setAuthorKey("")}
          >
            Lock author controls
          </button>
        )}
      </div>

      {/* Share Dialog */}
      {dialog === "share" && (
        <ShareDialog
          data={data}
          onClose={() => setDialog(null)}
          notify={setNotice}
        />
      )}

      {/* Report Dialog */}
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

      {/* Delete / Author Unlock Dialog */}
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

      {/* Remove Reply Confirmation Modal */}
      {dialog?.type === "remove" && (
        <Modal
          title="Remove this reply?"
          onClose={() => {
            if (!removing) setDialog(null);
          }}
        >
          <p className="mb-4">
            This permanently removes the reply and frees up a spot on this
            mixtape.
          </p>
          {removeError && (
            <p role="alert" className="feature-error mb-3">
              {removeError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-paper flex-1 py-3"
              disabled={removing}
              onClick={() => setDialog(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1 py-3"
              disabled={removing}
              onClick={removeReply}
            >
              {removing ? "Removing…" : "Confirm removal"}
            </button>
          </div>
        </Modal>
      )}

      {/* Notifications */}
      <Toast show={Boolean(notice)} message={notice} onClose={clearNotice} />
    </div>
  );
}
