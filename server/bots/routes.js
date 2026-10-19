const { createHash, timingSafeEqual, randomUUID } = require("node:crypto");
const { consumeSharedRateLimit } = require("../utils/rate-limit");
const { isDeleteKeyConfigured } = require("../utils/delete-key");
const { POST_QUOTA } = require("../services/confession-submission");
const { validateConfessionInput } = require("../utils/validation");
const { mountAdminAuth } = require("./admin-auth");
const {
  OPTIONS,
  DEFAULT_SETTINGS,
  BotError,
  validateSettings,
  validateDraft,
  digestContent,
  createGenerator,
} = require("./generation");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISCLOSURE = "[Automated fiction]\n\n";

function mountBots(
  app,
  { env, getDatabase, spotify, getToken, submitConfession, ai, allowedOrigins },
) {
  const configured = () =>
    isDeleteKeyConfigured(env) &&
    Boolean(
      env.BOT_AI_MODEL && (env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN),
    );
  const validSecret = (key) =>
    typeof env[key] === "string" &&
    env[key].length >= 32 &&
    ![
      env.SUPABASE_SERVICE_ROLE,
      env.DELETE_KEY_PEPPER,
      env.REPORT_HASH_SECRET,
      env.AI_GATEWAY_API_KEY,
      env.SPOTIFY_CLIENT_SECRET,
      env.BOT_ADMIN_SESSION_SECRET,
    ].includes(env[key]) &&
    env[key].length <= 256;
  const matches = (actual, expected) =>
    timingSafeEqual(
      createHash("sha256").update(actual).digest(),
      createHash("sha256").update(expected).digest(),
    );
  const guard = (key) => async (req, res, next) => {
    res.set("X-Robots-Tag", "noindex, nofollow");
    if (!validSecret(key))
      return res
        .status(503)
        .json({ error: "Bot administration is not configured." });
    try {
      const quota = await consumeSharedRateLimit({
        env,
        getDatabase,
        scope: "bot-admin",
        client: req.ip,
        windowMs: 60000,
        limit: 30,
      });
      if (!quota.allowed) {
        res.set("Retry-After", String(quota.retry_after || 60));
        return res
          .status(429)
          .json({ error: "Too many admin requests. Try again shortly." });
      }
    } catch {
      return res
        .status(503)
        .json({ error: "Admin protection is unavailable." });
    }
    const token = req.get("authorization") || "";
    if (token.length > 512 || !matches(token, `Bearer ${env[key]}`))
      return res
        .status(401)
        .json({ error: "Administrator authorization required." });
    next();
  };
  const control = async (action, input) => {
    const { data, error } = await getDatabase().rpc("bot_control", {
      p_action: action,
      p_input: input,
    });
    if (error) throw new BotError("UPSTREAM");
    return data;
  };
  const generate = createGenerator({ env, ai });
  const searchSong = async (draft, signal) => {
    const token = await getToken();
    const result = await spotify.get("https://api.spotify.com/v1/search", {
      params: { q: draft.songQuery, type: "track", limit: 1 },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 6000,
      signal,
    });
    const id = result.data?.tracks?.items?.[0]?.id;
    if (!/^[A-Za-z0-9]{22}$/.test(id || "")) throw new BotError("UPSTREAM");
    return id;
  };
  const submissionBody = (draft, settings) => ({
    to: "A fictional listener",
    from: "Mixtape Bot (fiction)",
    content: DISCLOSURE + draft.content,
    song: { id: draft.songId },
    allowReplies: settings.allowReplies,
  });
  const run = async ({ botId, requestKey, manual = false }) => {
    if (!configured()) throw new BotError("CONFIGURATION");
    const started = Date.now();
    const claim = await control("claim", { botId, requestKey, manual });
    if (claim?.state !== "claimed") return claim;
    const { job, settings, history } = claim;
    const lease = { jobId: job.id, lease: job.lease };
    try {
      const quota = await consumeSharedRateLimit({
        env,
        getDatabase,
        ...POST_QUOTA,
        client: "confession-automation",
      });
      if (!quota.allowed) throw new BotError("RATE_LIMIT", quota.retry_after);
      let draft = job.draft;
      if (!draft) {
        const signal = AbortSignal.timeout(28000);
        draft = await generate(settings, history, signal);
        draft.songId = await searchSong(draft, signal);
        const saved = await control("draft", {
          ...lease,
          draft,
          digest: digestContent(draft.content),
        });
        if (saved.state !== "ready") return saved;
      } else {
        validateDraft(draft);
      }
      const body = submissionBody(draft, settings);
      if (!validateConfessionInput(body).valid)
        throw new BotError("INVALID_OUTPUT");
      // Leave time for Spotify revalidation and the atomic database commit.
      if (Date.now() - started > 26000) throw new BotError("UPSTREAM");
      const result = await submitConfession(body, {
        id: job.id,
        lease: job.lease,
      });
      console.info(
        "[confession-bot]",
        JSON.stringify({ jobId: job.id, state: result.state }),
      );
      return result;
    } catch (error) {
      const code =
        error instanceof BotError
          ? error.code
          : error.response?.status === 429
            ? "RATE_LIMIT"
            : "UPSTREAM";
      const retryAfter =
        error.retryAfter ||
        Number(error.response?.headers?.["retry-after"]) ||
        300;
      console.error(
        "[confession-bot]",
        JSON.stringify({ jobId: job.id, code }),
      );
      // A committed publish with a lost HTTP response stays submitted; the RPC is idempotent.
      return control("fail", { ...lease, code, retryAfter });
    }
  };
  const safe = (handler) => async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const code = error instanceof BotError ? error.code : "UPSTREAM";
      console.error("[confession-bot]", JSON.stringify({ code }));
      res.status(code === "INVALID_OUTPUT" ? 400 : 503).json({
        error:
          code === "INVALID_OUTPUT"
            ? "Check the bot settings and request fields."
            : "Bot service unavailable. Check configuration and activity.",
        code,
      });
    }
  };
  mountAdminAuth(app, { env, getDatabase, allowedOrigins });
  app.get(
    "/api/admin/bots",
    safe(async (req, res) => {
      const { data, error } = await getDatabase().rpc("bot_dashboard");
      if (error) throw new BotError("UPSTREAM");
      res.json({
        ...data,
        options: OPTIONS,
        defaults: DEFAULT_SETTINGS,
        generationConfigured: configured(),
        schedulerConfigured: validSecret("CRON_SECRET"),
      });
    }),
  );
  app.post(
    "/api/admin/bots/save",
    safe(async (req, res) => {
      const { id, enabled, settings } = req.body || {};
      if ((id && !UUID.test(id)) || typeof enabled !== "boolean")
        throw new BotError("INVALID_OUTPUT");
      if (enabled && !configured()) throw new BotError("CONFIGURATION");
      res.json(
        await control("save", {
          id: id || null,
          enabled,
          settings: validateSettings(settings),
        }),
      );
    }),
  );
  app.post(
    "/api/admin/bots/preview",
    safe(async (req, res) => {
      const quota = await consumeSharedRateLimit({
        env,
        getDatabase,
        scope: "bot-preview",
        client: "confession-automation",
        windowMs: 900000,
        limit: 5,
      });
      if (!quota.allowed) {
        res.set("Retry-After", String(quota.retry_after || 60));
        return res
          .status(429)
          .json({ error: "Preview quota reached. Try again later." });
      }
      const settings = validateSettings(req.body?.settings);
      const draft = await generate(settings);
      draft.songId = await searchSong(draft, AbortSignal.timeout(6000));
      const body = submissionBody(draft, settings);
      if (!validateConfessionInput(body).valid)
        throw new BotError("INVALID_OUTPUT");
      res.json({ preview: body, published: false });
    }),
  );
  app.post(
    "/api/admin/bots/run",
    safe(async (req, res) => {
      if (
        !UUID.test(req.body?.botId || "") ||
        !UUID.test(req.body?.requestKey || "")
      )
        throw new BotError("INVALID_OUTPUT");
      res.json(
        await run({
          botId: req.body.botId,
          requestKey: req.body.requestKey,
          manual: true,
        }),
      );
    }),
  );
  app.post(
    "/api/admin/bots/remove",
    safe(async (req, res) => {
      if (!UUID.test(req.body?.confessionId || ""))
        throw new BotError("INVALID_OUTPUT");
      res.json(
        await control("remove", { confessionId: req.body.confessionId }),
      );
    }),
  );
  app.get(
    "/api/cron/confession-bots",
    guard("CRON_SECRET"),
    safe(async (req, res) => {
      res.json(await run({ requestKey: randomUUID() }));
    }),
  );
}
module.exports = { mountBots, DISCLOSURE };
