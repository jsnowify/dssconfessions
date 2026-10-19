import { useEffect, useRef, useState, useMemo } from "react";
import { api } from "../hooks";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import { getSpecialRecipientRole } from "../utils/confession-labels";

const label = (value) => value.replaceAll("-", " ");
const date = (value) =>
  value
    ? new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
    : "—";

const problems = {
  UPSTREAM: "An upstream service failed. Eligible jobs retry automatically.",
  RATE_LIMIT: "Waiting for the posting quota to reset.",
  SAFETY: "Content did not pass the safety review.",
  DUPLICATE: "Content was too similar to a previous generated post.",
  INVALID_OUTPUT: "The generator returned an invalid draft.",
  CONFIGURATION: "Generation is not configured.",
  LIBRARY_EXHAUSTED:
    "All stories from this collection have been posted. This bot is paused.",
  ATTEMPTS_EXHAUSTED: "Stopped after three attempts.",
};

const reasonLabels = {
  names_me: "This is about me and I want it removed",
  harassment: "Harassment or bullying",
  private_info: "Private or identifying info",
  hate_or_threat: "Hate or threats",
  spam: "Spam",
  other: "Something else",
};

function EditConfessionModal({ confession, onClose, onSave, busy }) {
  const [recipient, setRecipient] = useState(confession.recipient_to || "");
  const [sender, setSender] = useState(confession.sender_from || "");
  const [content, setContent] = useState(confession.content || "");
  const [isHidden, setIsHidden] = useState(Boolean(confession.is_hidden));
  const [needsReview, setNeedsReview] = useState(
    Boolean(confession.needs_review),
  );
  const [allowReplies, setAllowReplies] = useState(
    Boolean(confession.allow_replies),
  );
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setError("Recipient cannot be empty.");
      return;
    }
    if (!content.trim()) {
      setError("Message cannot be empty.");
      return;
    }
    onSave({
      recipient_to: recipient.trim(),
      sender_from: sender.trim() || null,
      content: content.trim(),
      is_hidden: isHidden,
      needs_review: needsReview,
      allow_replies: allowReplies,
    });
  };

  return (
    <Modal
      title="Edit confession"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="bot-fields">
        {error && (
          <p role="alert" className="feature-error">
            {error}
          </p>
        )}
        <label>
          To (Recipient)
          <input
            required
            maxLength={50}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </label>
        <label>
          From (Sender, optional)
          <input
            maxLength={50}
            value={sender}
            onChange={(e) => setSender(e.target.value)}
          />
        </label>
        <label>
          Confession message
          <textarea
            required
            rows={5}
            maxLength={1000}
            className="textarea w-full p-3 font-sans text-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-2 my-2">
          <label className="bot-check">
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
            />
            <span>Hide confession from public view (is_hidden)</span>
          </label>
          <label className="bot-check">
            <input
              type="checkbox"
              checked={needsReview}
              onChange={(e) => setNeedsReview(e.target.checked)}
            />
            <span>Marked for review flag (needs_review)</span>
          </label>
          <label className="bot-check">
            <input
              type="checkbox"
              checked={allowReplies}
              onChange={(e) => setAllowReplies(e.target.checked)}
            />
            <span>Allow song replies on this post (allow_replies)</span>
          </label>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            className="btn btn-paper flex-1 py-3"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1 py-3 font-bold text-button"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditReplyModal({ reply, onClose, onSave, busy }) {
  const [note, setNote] = useState(reply.note || "");
  const [isHidden, setIsHidden] = useState(Boolean(reply.is_hidden));
  const [needsReview, setNeedsReview] = useState(Boolean(reply.needs_review));
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (note && note.trim().length > 140) {
      setError("Note must be at most 140 characters.");
      return;
    }
    onSave({
      note: note.trim() || null,
      is_hidden: isHidden,
      needs_review: needsReview,
    });
  };

  return (
    <Modal
      title="Edit song reply"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="bot-fields">
        {error && (
          <p role="alert" className="feature-error">
            {error}
          </p>
        )}
        <div>
          <span className="font-bold block text-body-sm mb-1">Track</span>
          <p className="text-body-sm text-ink-soft">
            {reply.song_name} — {reply.artist_name}
          </p>
        </div>
        <label>
          Note (optional, max 140 chars)
          <textarea
            rows={3}
            maxLength={140}
            className="textarea w-full p-3 font-sans text-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-2 my-2">
          <label className="bot-check">
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
            />
            <span>Hide reply from public tracklist (is_hidden)</span>
          </label>
          <label className="bot-check">
            <input
              type="checkbox"
              checked={needsReview}
              onChange={(e) => setNeedsReview(e.target.checked)}
            />
            <span>Marked for review flag (needs_review)</span>
          </label>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            className="btn btn-paper flex-1 py-3"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1 py-3 font-bold text-button"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirmModal({ item, type, onClose, onConfirm, busy }) {
  const isConfession = type === "confession";
  return (
    <Modal
      title={
        isConfession
          ? "Delete confession permanently?"
          : "Delete reply permanently?"
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">
          {isConfession
            ? "This will permanently remove this confession, all of its song replies, and associated reports from the database. This action cannot be undone."
            : "This will permanently remove this song reply and its reports from the database. This action cannot be undone."}
        </p>
        <div className="p-3 bg-(--sleeve) border-2 border-(--ink) rounded-(--radius-sm) text-body-sm">
          <strong>Target: </strong>
          {isConfession
            ? `To: ${item.recipient_to} | "${item.content?.slice(0, 80)}${item.content?.length > 80 ? "…" : ""}"`
            : `Track: ${item.song_name} — ${item.artist_name}${item.note ? ` ("${item.note}")` : ""}`}
        </div>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            className="btn btn-paper flex-1 py-3"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1 py-3 font-bold text-ink"
            style={{ backgroundColor: "var(--peach)" }}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Deleting…" : "Confirm Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BotEditor({ bot, defaults, options, busy, onSave, onPreview, onRun }) {
  const [settings, setSettings] = useState(() => ({
    ...defaults,
    ...bot?.settings,
    language:
      bot?.settings.source === "pinoy-horror-500" ? "Tagalog" : "English",
    storyTypes: bot?.settings.storyTypes || defaults.storyTypes,
  }));
  const [enabled, setEnabled] = useState(bot?.enabled || false);
  const update = (key, value) =>
    setSettings((previous) => ({ ...previous, [key]: value }));
  const completed = bot && bot.published_count >= bot.settings.postLimit;
  const imported = settings.source === "pinoy-horror-500";
  return (
    <section
      className="bot-editor"
      aria-label={bot?.settings.name || "New bot"}
    >
      <div className="bot-editor__heading">
        <h2>{bot ? bot.settings.name : "Add a storyteller"}</h2>
        {bot && (
          <span className="bot-status">
            {completed ? "Complete" : bot.enabled ? "Enabled" : "Paused"}
          </span>
        )}
      </div>
      {bot && (
        <p>
          {bot.published_count} of {bot.settings.postLimit} posts published.
          Next eligible: {date(bot.next_run_at)}.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ id: bot?.id, enabled, settings });
        }}
      >
        <fieldset disabled={busy} className="bot-fields">
          <Select
            label="Story collection"
            value={settings.source || "generated"}
            options={[
              { value: "generated", label: "Built-in funny / horror" },
              { value: "pinoy-horror-500", label: "500 Pinoy horror stories" },
            ]}
            onChange={(source) =>
              setSettings((previous) => ({
                ...previous,
                source,
                language: source === "pinoy-horror-500" ? "Tagalog" : "English",
                intervalMinutes: source === "pinoy-horror-500" ? 720 : 1440,
                postLimit: source === "pinoy-horror-500" ? 500 : 10,
                storyTypes:
                  source === "pinoy-horror-500"
                    ? ["horror"]
                    : ["funny", "horror"],
              }))
            }
          />
          {imported && (
            <p>
              Original Tagalog stories, picked randomly without repeats. Two per
              day: 8 AM and 8 PM Philippine time. Pauses when the collection
              runs out.
            </p>
          )}
          <label>
            Bot name
            <input
              required
              maxLength={50}
              value={settings.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <div className="bot-fields__pair">
            <label>
              Interval (minutes)
              <input
                type="number"
                min={15}
                max={10080}
                required
                value={settings.intervalMinutes}
                onChange={(event) =>
                  update("intervalMinutes", Number(event.target.value))
                }
              />
            </label>
            <label>
              Lifetime limit
              <input
                type="number"
                min={1}
                max={500}
                required
                value={settings.postLimit}
                onChange={(event) =>
                  update("postLimit", Number(event.target.value))
                }
              />
            </label>
          </div>
          {!imported && (
            <>
              <fieldset className="bot-categories">
                <legend>Story types</legend>
                {options.storyTypes.map((type) => (
                  <label key={type}>
                    <input
                      type="checkbox"
                      checked={settings.storyTypes.includes(type)}
                      onChange={(event) => {
                        const current = settings.storyTypes;
                        const next = event.target.checked
                          ? [...current, type]
                          : current.filter((item) => item !== type);
                        if (next.length) update("storyTypes", next);
                      }}
                    />
                    <span>{label(type)}</span>
                  </label>
                ))}
              </fieldset>
              <div className="bot-fields__pair">
                <Select
                  label="Category"
                  value={settings.category}
                  options={options.categories.map((value) => ({
                    value,
                    label: label(value),
                  }))}
                  onChange={(value) => update("category", value)}
                />
                <Select
                  label="Style"
                  value={settings.style}
                  options={options.styles.map((value) => ({
                    value,
                    label: label(value),
                  }))}
                  onChange={(value) => update("style", value)}
                />
              </div>
              <div className="bot-fields__pair">
                <Select
                  label="Tone"
                  value={settings.tone}
                  options={options.tones.map((value) => ({
                    value,
                    label: label(value),
                  }))}
                  onChange={(value) => update("tone", value)}
                />
                <Select
                  label="Length"
                  value={settings.length}
                  options={options.lengths.map((value) => ({
                    value,
                    label: label(value),
                  }))}
                  onChange={(value) => update("length", value)}
                />
              </div>
            </>
          )}
          <label className="bot-check">
            <input
              type="checkbox"
              checked={settings.allowReplies}
              onChange={(event) => update("allowReplies", event.target.checked)}
            />
            <span>Allow song replies on published posts</span>
          </label>
          <label className="bot-check">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span>Enable automated publishing for this profile</span>
          </label>
          <div className="bot-actions">
            <button className="btn btn-paper" disabled={busy}>
              Save storyteller
            </button>
            <button
              className="btn btn-paper"
              type="button"
              disabled={busy}
              onClick={() => onPreview(settings)}
            >
              Preview only
            </button>
            {bot && (
              <button
                className="btn btn-ink"
                type="button"
                disabled={!bot.enabled || completed}
                onClick={() => onRun(bot.id)}
              >
                Run now · publish one
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}

export default function BotAdminView({ initialTab = "moderation" }) {
  const [tab, setTab] = useState(initialTab);
  const [credential, setCredential] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [moderation, setModeration] = useState({ confessions: [], replies: [] });
  const [modFilter, setModFilter] = useState("all");
  const [modSearch, setModSearch] = useState("");
  const [editConfession, setEditConfession] = useState(null);
  const [editReply, setEditReply] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);
  const [remove, setRemove] = useState(null);
  const [adding, setAdding] = useState(false);
  const controller = useRef(null);
  const runKeys = useRef({});
  const working = useRef(false);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  const lock = (keepRemoval = false) => {
    controller.current?.abort();
    runKeys.current = {};
    working.current = false;
    setIsAuthenticated(false);
    setDashboard(null);
    setModeration({ confessions: [], replies: [] });
    setCredential("");
    setPreview(null);
    if (!keepRemoval) setRemove(null);
    setBusy(false);
  };

  const adminRequest = async (path = "", body, method = undefined) => {
    const httpMethod = method || (body === undefined ? "GET" : "POST");
    const response = await api.request({
      url: `/api/admin${path}`,
      method: httpMethod,
      data: body,
      headers: { "X-Bot-Admin": "1", "X-Admin": "1" },
      signal: controller.current?.signal,
      timeout: 43000,
    });
    return response.data;
  };

  const request = (path = "", body) => adminRequest(`/bots${path}`, body);

  const act = async (operation) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setNotice("");
    controller.current = new AbortController();
    const active = controller.current;
    try {
      await operation();
    } catch (error) {
      if (active.signal.aborted) return;
      if (error.response?.status === 401) {
        lock(Boolean(dashboard || moderation.confessions.length));
        setNotice("Your admin session expired. Sign in again to continue.");
        return;
      }
      setNotice(
        error.response?.data?.error ||
          "The request did not finish. Please try again.",
      );
    } finally {
      if (!active.signal.aborted) {
        working.current = false;
        setBusy(false);
      }
    }
  };

  const refreshModeration = async () => {
    const data = await adminRequest("/reports");
    setModeration(data || { confessions: [], replies: [] });
  };

  const refreshBots = async () => {
    const data = await request();
    setDashboard(data);
  };

  const refreshAll = async () => {
    await Promise.all([refreshModeration(), refreshBots()]);
    setIsAuthenticated(true);
  };

  // Check existing session on mount
  useEffect(() => {
    let active = true;
    adminRequest("/session")
      .then(() => {
        if (!active) return;
        setIsAuthenticated(true);
        refreshAll().catch(() => {});
      })
      .catch(() => {
        // Not logged in or expired; stay on password prompt
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (body) =>
    act(async () => {
      await request("/save", body);
      await refreshBots();
      setAdding(false);
      setNotice("Settings saved.");
    });

  const run = (botId) =>
    act(async () => {
      runKeys.current[botId] ||= crypto.randomUUID();
      const result = await request("/run", {
        botId,
        requestKey: runKeys.current[botId],
      });
      if (
        ["submitted", "failed", "duplicate", "cancelled"].includes(result.state)
      )
        delete runKeys.current[botId];
      await refreshBots();
      setNotice(
        result.state === "submitted"
          ? "One automated fictional confession was published."
          : result.state === "retry"
            ? "The job is waiting for a retry. Check recent activity for its status."
            : result.state === "busy"
              ? "A job is already running. Refresh activity shortly."
              : result.state === "idle"
                ? "No enabled bot is eligible. Save settings before running."
                : `Job ${result.state}. Check recent activity.`,
      );
    });

  // Moderation action handlers
  const handleSaveConfession = (updates) => {
    if (!editConfession) return;
    act(async () => {
      await adminRequest(
        `/confessions/${editConfession.id}`,
        updates,
        "PATCH",
      );
      setEditConfession(null);
      setNotice("Confession updated.");
      await refreshModeration();
    });
  };

  const handleSaveReply = (updates) => {
    if (!editReply) return;
    act(async () => {
      await adminRequest(`/replies/${editReply.id}`, updates, "PATCH");
      setEditReply(null);
      setNotice("Song reply updated.");
      await refreshModeration();
    });
  };

  const handleToggleHideConfession = (item) => {
    act(async () => {
      await adminRequest(
        `/confessions/${item.id}`,
        { is_hidden: !item.is_hidden },
        "PATCH",
      );
      setNotice(
        item.is_hidden
          ? "Confession unhidden and restored to public view."
          : "Confession hidden from public view.",
      );
      await refreshModeration();
    });
  };

  const handleToggleHideReply = (item) => {
    act(async () => {
      await adminRequest(
        `/replies/${item.id}`,
        { is_hidden: !item.is_hidden },
        "PATCH",
      );
      setNotice(
        item.is_hidden
          ? "Reply unhidden and restored to public tracklist."
          : "Reply hidden from tracklist.",
      );
      await refreshModeration();
    });
  };

  const handleDismissReports = (type, id) => {
    act(async () => {
      await adminRequest("/reports/dismiss", {
        targetType: type,
        targetId: id,
      });
      setNotice("Reports dismissed and review status cleared.");
      await refreshModeration();
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    act(async () => {
      if (deleteItem.type === "confession") {
        await adminRequest(
          `/confessions/${deleteItem.item.id}`,
          undefined,
          "DELETE",
        );
        setNotice("Confession permanently deleted.");
      } else {
        await adminRequest(`/replies/${deleteItem.item.id}`, undefined, "DELETE");
        setNotice("Song reply permanently deleted.");
      }
      setDeleteItem(null);
      await refreshModeration();
    });
  };

  // Filtered moderation items
  const filteredConfessions = useMemo(() => {
    let list = moderation.confessions || [];
    if (modFilter === "needs_review") list = list.filter((c) => c.needs_review);
    if (modFilter === "hidden") list = list.filter((c) => c.is_hidden);
    if (modSearch.trim()) {
      const q = modSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.recipient_to?.toLowerCase().includes(q) ||
          c.sender_from?.toLowerCase().includes(q) ||
          c.content?.toLowerCase().includes(q) ||
          c.song_name?.toLowerCase().includes(q) ||
          c.artist_name?.toLowerCase().includes(q) ||
          c.reasons?.some((r) => r.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [moderation.confessions, modFilter, modSearch]);

  const filteredReplies = useMemo(() => {
    let list = moderation.replies || [];
    if (modFilter === "needs_review") list = list.filter((r) => r.needs_review);
    if (modFilter === "hidden") list = list.filter((r) => r.is_hidden);
    if (modSearch.trim()) {
      const q = modSearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.parent_recipient?.toLowerCase().includes(q) ||
          r.note?.toLowerCase().includes(q) ||
          r.song_name?.toLowerCase().includes(q) ||
          r.artist_name?.toLowerCase().includes(q) ||
          r.reasons?.some((reason) => reason.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [moderation.replies, modFilter, modSearch]);

  const totalReportsCount =
    (moderation.confessions || []).reduce(
      (sum, c) => sum + (c.report_count || 0),
      0,
    ) +
    (moderation.replies || []).reduce(
      (sum, r) => sum + (r.report_count || 0),
      0,
    );
  const totalNeedsReview =
    (moderation.confessions || []).filter((c) => c.needs_review).length +
    (moderation.replies || []).filter((r) => r.needs_review).length;
  const totalHidden =
    (moderation.confessions || []).filter((c) => c.is_hidden).length +
    (moderation.replies || []).filter((r) => r.is_hidden).length;

  return (
    <div className="bot-admin">
      <header className="bot-admin__intro">
        <h1>DSSC Admin Dashboard</h1>
        <p>
          Moderate reported student confessions & song replies, and manage
          mixtape storytellers.
        </p>
      </header>

      <p role="status" aria-live="polite" className="bot-notice">
        {busy ? "Working…" : notice}
      </p>

      {!isAuthenticated && !dashboard ? (
        <form
          className="bot-editor bot-login"
          onSubmit={(event) => {
            event.preventDefault();
            act(async () => {
              await adminRequest("/login", { password: credential });
              setCredential("");
              await refreshAll();
            });
          }}
        >
          <h2>Admin sign-in</h2>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={256}
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
            />
          </label>
          <p>Enter your administrator password to proceed.</p>
          <button className="btn btn-ink" disabled={busy}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          {/* Top Admin Navigation Tabs & Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <nav className="admin-tabs" aria-label="Admin Sections">
              <button
                type="button"
                className={`admin-tab ${tab === "moderation" ? "admin-tab--active" : ""}`}
                onClick={() => setTab("moderation")}
              >
                <span>Moderation & Reports</span>
                {totalReportsCount > 0 && (
                  <span className="admin-tab__count">{totalReportsCount}</span>
                )}
              </button>
              <button
                type="button"
                className={`admin-tab ${tab === "bots" ? "admin-tab--active" : ""}`}
                onClick={() => setTab("bots")}
              >
                <span>Storyteller Bots</span>
              </button>
            </nav>

            <div className="bot-toolbar mb-0">
              <button
                className="btn btn-paper"
                disabled={busy}
                onClick={() => act(tab === "moderation" ? refreshModeration : refreshBots)}
              >
                Refresh
              </button>
              <button
                className="btn btn-paper"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await adminRequest("/logout", {});
                    lock();
                  })
                }
              >
                Sign out
              </button>
            </div>
          </div>

          {/* ================= MODERATION TAB ================= */}
          {tab === "moderation" && (
            <section aria-label="Content Moderation">
              <div className="mod-stats-bar">
                <button
                  type="button"
                  className={`mod-filter-btn ${modFilter === "all" ? "mod-filter-btn--active" : ""}`}
                  onClick={() => setModFilter("all")}
                >
                  All ({(moderation.confessions?.length || 0) + (moderation.replies?.length || 0)})
                </button>
                <button
                  type="button"
                  className={`mod-filter-btn ${modFilter === "confessions" ? "mod-filter-btn--active" : ""}`}
                  onClick={() => setModFilter("confessions")}
                >
                  Confessions ({moderation.confessions?.length || 0})
                </button>
                <button
                  type="button"
                  className={`mod-filter-btn ${modFilter === "replies" ? "mod-filter-btn--active" : ""}`}
                  onClick={() => setModFilter("replies")}
                >
                  Song Replies ({moderation.replies?.length || 0})
                </button>
                <button
                  type="button"
                  className={`mod-filter-btn ${modFilter === "needs_review" ? "mod-filter-btn--active" : ""}`}
                  onClick={() => setModFilter("needs_review")}
                >
                  Needs Review ({totalNeedsReview})
                </button>
                <button
                  type="button"
                  className={`mod-filter-btn ${modFilter === "hidden" ? "mod-filter-btn--active" : ""}`}
                  onClick={() => setModFilter("hidden")}
                >
                  Hidden ({totalHidden})
                </button>
              </div>

              <input
                type="search"
                className="mod-search-input"
                placeholder="Filter by recipient, sender, note, message, song, or report reason…"
                value={modSearch}
                onChange={(e) => setModSearch(e.target.value)}
              />

              {/* Confessions List */}
              {modFilter !== "replies" && (
                <div className="mb-8">
                  <h2 className="text-h2 font-bold mb-4">
                    Reported & Flagged Confessions ({filteredConfessions.length})
                  </h2>
                  {filteredConfessions.length === 0 ? (
                    <p className="p-6 bg-(--surface) border-2 border-(--ink) rounded-(--radius-sm) text-body-sm text-ink-soft">
                      No reported or flagged confessions matching filter.
                    </p>
                  ) : (
                    filteredConfessions.map((confession) => {
                      const specialRole = getSpecialRecipientRole(
                        confession.recipient_to,
                      );
                      return (
                        <article key={confession.id} className="mod-card">
                          <div className="mod-card__header">
                            <div className="mod-card__badges">
                              {confession.report_count > 0 ? (
                                <span className="mod-badge mod-badge--alert">
                                  {confession.report_count} report
                                  {confession.report_count === 1 ? "" : "s"}
                                </span>
                              ) : (
                                <span className="mod-badge mod-badge--ok">
                                  0 reports
                                </span>
                              )}
                              {confession.needs_review && (
                                <span className="mod-badge mod-badge--review">
                                  Needs Review
                                </span>
                              )}
                              {confession.is_hidden && (
                                <span className="mod-badge mod-badge--hidden">
                                  Hidden from feed
                                </span>
                              )}
                              {confession.is_automated && (
                                <span className="mod-badge mod-badge--bot">
                                  Fictional Story
                                </span>
                              )}
                            </div>
                            <span className="text-meta text-ink-soft">
                              {date(confession.created_at)}
                            </span>
                          </div>

                          <div className="mod-card__body">
                            <div className="mod-card__meta">
                              <div>
                                <strong>To: </strong>
                                <span>{confession.recipient_to}</span>
                                {specialRole && (
                                  <span className="inline-block px-2 py-0.5 text-meta font-bold bg-(--primary) border-1.5 border-(--ink) rounded-full ml-2">
                                    {specialRole.label}
                                  </span>
                                )}
                              </div>
                              <div>
                                <strong>From: </strong>
                                <span>{confession.sender_from || "Anonymous"}</span>
                              </div>
                              <div>
                                <strong>Track: </strong>
                                <span>
                                  {confession.song_name} — {confession.artist_name}
                                </span>
                              </div>
                            </div>

                            <div className="mod-card__content">
                              "{confession.content}"
                            </div>

                            <div className="flex flex-wrap gap-4 text-meta text-ink-soft mt-2">
                              <span>Pokes: {confession.poke_count || 0}</span>
                              <span>
                                Replies allowed:{" "}
                                {confession.allow_replies ? "Yes" : "No"}
                              </span>
                            </div>

                            {/* Reports list */}
                            {confession.reports?.length > 0 && (
                              <div className="mod-reports-box">
                                <strong>Reported for:</strong>
                                <div className="mod-reports-box__reasons">
                                  {confession.reasons?.map((r) => (
                                    <span
                                      key={r}
                                      className="mod-reports-box__reason-tag"
                                    >
                                      {reasonLabels[r] || r}
                                    </span>
                                  ))}
                                </div>
                                {confession.reports.some((r) => r.details) && (
                                  <div className="mt-2">
                                    <strong>Reporter notes:</strong>
                                    <ul className="list-disc pl-5 mt-1">
                                      {confession.reports
                                        .filter((r) => r.details)
                                        .map((r) => (
                                          <li key={r.id}>{r.details}</li>
                                        ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mod-card__actions">
                            <button
                              type="button"
                              className="btn btn-paper"
                              disabled={busy}
                              onClick={() => setEditConfession(confession)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-paper"
                              disabled={busy}
                              onClick={() =>
                                handleDismissReports("confession", confession.id)
                              }
                            >
                              Dismiss reports
                            </button>
                            <button
                              type="button"
                              className="btn btn-paper"
                              disabled={busy}
                              onClick={() =>
                                handleToggleHideConfession(confession)
                              }
                            >
                              {confession.is_hidden ? "Unhide" : "Hide"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-paper text-ink"
                              style={{ backgroundColor: "var(--peach)" }}
                              disabled={busy}
                              onClick={() =>
                                setDeleteItem({
                                  type: "confession",
                                  item: confession,
                                })
                              }
                            >
                              Delete
                            </button>
                            <a
                              href={`/confession/${confession.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-paper"
                            >
                              View on site ↗
                            </a>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              )}

              {/* Replies List */}
              {modFilter !== "confessions" && (
                <div>
                  <h2 className="text-h2 font-bold mb-4">
                    Reported & Flagged Song Replies ({filteredReplies.length})
                  </h2>
                  {filteredReplies.length === 0 ? (
                    <p className="p-6 bg-(--surface) border-2 border-(--ink) rounded-(--radius-sm) text-body-sm text-ink-soft">
                      No reported or flagged song replies matching filter.
                    </p>
                  ) : (
                    filteredReplies.map((reply) => (
                      <article key={reply.id} className="mod-card">
                        <div className="mod-card__header">
                          <div className="mod-card__badges">
                            {reply.report_count > 0 ? (
                              <span className="mod-badge mod-badge--alert">
                                Reply: {reply.report_count} report
                                {reply.report_count === 1 ? "" : "s"}
                              </span>
                            ) : (
                              <span className="mod-badge mod-badge--ok">
                                0 reports
                              </span>
                            )}
                            {reply.needs_review && (
                              <span className="mod-badge mod-badge--review">
                                Needs Review
                              </span>
                            )}
                            {reply.is_hidden && (
                              <span className="mod-badge mod-badge--hidden">
                                Hidden
                              </span>
                            )}
                          </div>
                          <span className="text-meta text-ink-soft">
                            {date(reply.created_at)}
                          </span>
                        </div>

                        <div className="mod-card__body">
                          <div className="mod-card__meta">
                            <div>
                              <strong>Parent Confession: </strong>
                              <span>To: {reply.parent_recipient}</span>
                            </div>
                            <div>
                              <strong>Track: </strong>
                              <span>
                                {reply.song_name} — {reply.artist_name}
                              </span>
                            </div>
                            {reply.note && (
                              <div>
                                <strong>Note: </strong>
                                <span>"{reply.note}"</span>
                              </div>
                            )}
                          </div>

                          {/* Reports list */}
                          {reply.reports?.length > 0 && (
                            <div className="mod-reports-box">
                              <strong>Reported for:</strong>
                              <div className="mod-reports-box__reasons">
                                {reply.reasons?.map((r) => (
                                  <span
                                    key={r}
                                    className="mod-reports-box__reason-tag"
                                  >
                                    {reasonLabels[r] || r}
                                  </span>
                                ))}
                              </div>
                              {reply.reports.some((r) => r.details) && (
                                <div className="mt-2">
                                  <strong>Reporter notes:</strong>
                                  <ul className="list-disc pl-5 mt-1">
                                    {reply.reports
                                      .filter((r) => r.details)
                                      .map((r) => (
                                        <li key={r.id}>{r.details}</li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mod-card__actions">
                          <button
                            type="button"
                            className="btn btn-paper"
                            disabled={busy}
                            onClick={() => setEditReply(reply)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-paper"
                            disabled={busy}
                            onClick={() =>
                              handleDismissReports("reply", reply.id)
                            }
                          >
                            Dismiss reports
                          </button>
                          <button
                            type="button"
                            className="btn btn-paper"
                            disabled={busy}
                            onClick={() => handleToggleHideReply(reply)}
                          >
                            {reply.is_hidden ? "Unhide" : "Hide"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-paper text-ink"
                            style={{ backgroundColor: "var(--peach)" }}
                            disabled={busy}
                            onClick={() =>
                              setDeleteItem({ type: "reply", item: reply })
                            }
                          >
                            Delete
                          </button>
                          <a
                            href={`/confession/${reply.confession_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-paper"
                          >
                            View parent post ↗
                          </a>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {/* ================= BOTS TAB ================= */}
          {tab === "bots" && (
            <section aria-label="Storyteller Bots Management">
              {dashboard?.library && (
                <p>
                  {dashboard.library.available} of {dashboard.library.total}{" "}
                  collection stories still available. Posted stories stay
                  excluded after removal.
                </p>
              )}
              {dashboard &&
                (!dashboard.generationConfigured ||
                  !dashboard.schedulerConfigured) && (
                  <p className="bot-warning">
                    {!dashboard.generationConfigured &&
                      "Posting setup is incomplete. "}
                    {!dashboard.schedulerConfigured &&
                      "The scheduler secret is missing. "}
                    Configure the server environment before enabling automated
                    publishing.
                  </p>
                )}
              <p className="bot-note">
                Bots follow the frequency you save and stop when their post limit
                is reached. The local schedule runs while your backend is open.
              </p>
              <div className="bot-editors">
                {dashboard?.bots?.map((bot) => (
                  <BotEditor
                    key={`${bot.id}-${bot.updated_at}`}
                    bot={bot}
                    {...dashboard}
                    busy={busy}
                    onSave={save}
                    onPreview={(settings) =>
                      act(async () =>
                        setPreview(
                          (await request("/preview", { settings })).preview,
                        ),
                      )
                    }
                    onRun={run}
                  />
                ))}
              </div>
              {dashboard && dashboard.bots?.length < 5 &&
                (adding || !dashboard.bots?.length ? (
                  <BotEditor
                    key="new"
                    {...dashboard}
                    busy={busy}
                    onSave={save}
                    onPreview={(settings) =>
                      act(async () =>
                        setPreview(
                          (await request("/preview", { settings })).preview,
                        ),
                      )
                    }
                  />
                ) : (
                  <button
                    className="btn btn-paper"
                    onClick={() => setAdding(true)}
                  >
                    Add a bot
                  </button>
                ))}

              <section className="bot-activity">
                <h2>Recent activity</h2>
                <p>Times are shown in Philippine time.</p>
                {!dashboard?.activity?.length ? (
                  <p>
                    No runs yet. Preview a draft, then save and enable a bot when
                    ready.
                  </p>
                ) : (
                  <ol>
                    {dashboard.activity.map((job) => (
                      <li key={job.id}>
                        <div>
                          <strong>
                            {dashboard.bots?.find((bot) => bot.id === job.bot_id)
                              ?.settings.name || "Storyteller"}
                          </strong>
                          <span className="bot-status">{job.status}</span>
                        </div>
                        <p>
                          {date(job.updated_at)} · Attempt {job.attempts}
                        </p>
                        {job.error_code && (
                          <p>
                            {problems[job.error_code] || "This run stopped."}
                          </p>
                        )}
                        {job.status === "retry" && (
                          <p>Retry eligible: {date(job.next_attempt_at)}</p>
                        )}
                        {job.confession_id && (
                          <div className="bot-actions">
                            <a
                              href={`/confession/${job.confession_id}`}
                              className="btn btn-paper"
                            >
                              View post
                            </a>
                            <button
                              className="btn btn-paper"
                              disabled={busy}
                              onClick={() => setRemove(job.confession_id)}
                            >
                              Remove bot post
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </section>
          )}
        </>
      )}

      {/* Modals */}
      {editConfession && (
        <EditConfessionModal
          confession={editConfession}
          busy={busy}
          onClose={() => setEditConfession(null)}
          onSave={handleSaveConfession}
        />
      )}

      {editReply && (
        <EditReplyModal
          reply={editReply}
          busy={busy}
          onClose={() => setEditReply(null)}
          onSave={handleSaveReply}
        />
      )}

      {deleteItem && (
        <DeleteConfirmModal
          item={deleteItem.item}
          type={deleteItem.type}
          busy={busy}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {preview && (
        <Modal
          title="Fictional draft · unpublished"
          onClose={() => setPreview(null)}
        >
          <p className="bot-preview">{preview.content}</p>
          <p>
            To: {preview.to} · From: {preview.from}
          </p>
          <p>Preview only. Nothing was submitted.</p>
          <button className="btn btn-paper" onClick={() => setPreview(null)}>
            Close preview
          </button>
        </Modal>
      )}

      {dashboard && remove && (
        <Modal title="Remove this bot post?" onClose={() => setRemove(null)}>
          <p>
            This removes the generated confession and its song replies. Its job
            record stays to prevent duplicate retries.
          </p>
          <div className="bot-actions">
            <button
              className="btn btn-ink"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  const result = await request("/remove", {
                    confessionId: remove,
                  });
                  setRemove(null);
                  setNotice(
                    result.removed
                      ? "Bot post removed."
                      : "This bot post is already removed or unavailable.",
                  );
                  await refreshBots();
                })
              }
            >
              Remove bot post
            </button>
            <button
              className="btn btn-paper"
              disabled={busy}
              onClick={() => setRemove(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
