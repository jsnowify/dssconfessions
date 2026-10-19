import { useEffect, useRef, useState } from "react";
import { api } from "../hooks";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";

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
  ATTEMPTS_EXHAUSTED: "Stopped after three attempts.",
};

function BotEditor({ bot, defaults, options, busy, onSave, onPreview, onRun }) {
  const [settings, setSettings] = useState(bot?.settings || defaults);
  const [enabled, setEnabled] = useState(bot?.enabled || false);
  const update = (key, value) =>
    setSettings((previous) => ({ ...previous, [key]: value }));
  const completed = bot && bot.published_count >= bot.settings.postLimit;
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
              Total posts
              <input
                type="number"
                required
                min={1}
                max={100}
                value={settings.postLimit}
                onChange={(event) =>
                  update("postLimit", Number(event.target.value))
                }
              />
            </label>
            <label>
              Interval in minutes
              <input
                type="number"
                required
                min={15}
                max={10080}
                value={settings.intervalMinutes}
                onChange={(event) =>
                  update("intervalMinutes", Number(event.target.value))
                }
              />
            </label>
          </div>
          <fieldset className="bot-categories">
            <legend>Topics</legend>
            {options.categories.map((category) => (
              <label key={category}>
                <input
                  type="checkbox"
                  checked={settings.categories.includes(category)}
                  onChange={(event) =>
                    update(
                      "categories",
                      event.target.checked
                        ? [...settings.categories, category]
                        : settings.categories.filter(
                            (value) => value !== category,
                          ),
                    )
                  }
                />
                {label(category)}
              </label>
            ))}
          </fieldset>
          <div className="bot-fields__pair">
            {[
              ["style", "Writing style", "styles"],
              ["tone", "Tone", "tones"],
              ["length", "Length", "lengths"],
              ["language", "Language", "languages"],
            ].map(([key, title, list]) => (
              <Select
                key={key}
                label={title}
                options={options[list].map((value) => ({
                  value,
                  label: label(value),
                }))}
                value={settings[key]}
                onChange={(value) => update(key, value)}
                disabled={busy}
              />
            ))}
          </div>
          <label className="bot-check">
            <input
              type="checkbox"
              checked={settings.allowReplies}
              onChange={(event) => update("allowReplies", event.target.checked)}
            />{" "}
            Allow song replies
          </label>
          <label className="bot-check">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />{" "}
            Enable publishing after saving
          </label>
          <p className="bot-note">
            The total is a lifetime limit for this bot. Saving changes cancels
            any unfinished job using the previous settings.
          </p>
          <div className="bot-actions">
            <button className="btn btn-primary" type="submit">
              {bot ? "Save settings" : "Create bot"}
            </button>
            <button
              className="btn btn-paper"
              type="button"
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

export default function BotAdminView() {
  const [credential, setCredential] = useState("");
  const [dashboard, setDashboard] = useState(null);
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
  const lock = () => {
    controller.current?.abort();
    runKeys.current = {};
    working.current = false;
    setDashboard(null);
    setCredential("");
    setPreview(null);
    setRemove(null);
    setBusy(false);
  };
  const request = async (path = "", body) => {
    const response = await api.request({
      url: `/api/admin/bots${path}`,
      method: body === undefined ? "GET" : "POST",
      data: body,
      headers: { "X-Bot-Admin": "1" },
      signal: controller.current.signal,
      timeout: 43000,
    });
    return response.data;
  };
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
      if (error.response?.status === 401) lock();
      setNotice(
        error.response?.data?.error ||
          "The request did not finish. Refresh activity before retrying; run retries reuse the same request key.",
      );
    } finally {
      if (!active.signal.aborted) {
        working.current = false;
        setBusy(false);
      }
    }
  };
  const refresh = async () => setDashboard(await request());
  const save = (body) =>
    act(async () => {
      await request("/save", body);
      await refresh();
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
      await refresh();
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
  return (
    <div className="bot-admin">
      <header className="bot-admin__intro">
        <h1>Mixtape storytellers</h1>
        <p>
          Manage clearly labeled fictional confessions. Real community
          submissions stay anonymous.
        </p>
      </header>
      <p role="status" aria-live="polite" className="bot-notice">
        {busy ? "Working…" : notice}
      </p>
      {!dashboard ? (
        <form
          className="bot-editor bot-login"
          onSubmit={(event) => {
            event.preventDefault();
            act(async () => {
              await request("/login", { password: credential });
              setCredential("");
              await refresh();
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
          <p>Enter your password to manage your storytellers.</p>
          <button className="btn btn-ink" disabled={busy}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          <div className="bot-toolbar">
            <button
              className="btn btn-paper"
              disabled={busy}
              onClick={() => act(refresh)}
            >
              Refresh activity
            </button>
            <button
              className="btn btn-paper"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await request("/logout", {});
                  lock();
                })
              }
            >
              Sign out
            </button>
          </div>
          {(!dashboard.generationConfigured ||
            !dashboard.schedulerConfigured) && (
            <p className="bot-warning">
              {!dashboard.generationConfigured &&
                "Generation credentials or posting configuration are missing. "}
              {!dashboard.schedulerConfigured &&
                "The scheduler secret is missing. "}
              Configure the server environment before enabling automated
              publishing.
            </p>
          )}
          <p className="bot-note">
            The included schedule checks daily at 8 am Philippine time. Shorter
            intervals need a more frequent authenticated scheduler. Each tick
            publishes at most one eligible post across all bots.
          </p>
          <div className="bot-editors">
            {dashboard.bots.map((bot) => (
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
          {dashboard.bots.length < 5 &&
            (adding || !dashboard.bots.length ? (
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
              <button className="btn btn-paper" onClick={() => setAdding(true)}>
                Add a bot
              </button>
            ))}
          <section className="bot-activity">
            <h2>Recent activity</h2>
            <p>Times are shown in Philippine time.</p>
            {!dashboard.activity.length ? (
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
                        {dashboard.bots.find((bot) => bot.id === job.bot_id)
                          ?.settings.name || "Storyteller"}
                      </strong>
                      <span className="bot-status">{job.status}</span>
                    </div>
                    <p>
                      {date(job.updated_at)} · Attempt {job.attempts}
                    </p>
                    {job.error_code && (
                      <p>{problems[job.error_code] || "This run stopped."}</p>
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
        </>
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
      {remove && (
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
                  await request("/remove", { confessionId: remove });
                  setRemove(null);
                  await refresh();
                  setNotice("Bot post removed.");
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
