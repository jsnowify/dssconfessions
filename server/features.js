const { reporterHash } = require("./utils/report-hash");
const { consumeSharedRateLimit } = require("./utils/rate-limit");
const { matchesDeleteKey, KEY_PATTERN } = require("./utils/delete-key");
const { verifiedTrack } = require("./utils/verified-track");
const config = require("./config/features");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (res, status, error) => res.status(status).json({ error });

function mountFeatures(
  app,
  {
    env,
    getDatabase,
    spotify,
    getToken,
    background = () => {},
    readLimiter,
    webhook = fetch,
  },
) {
  const safe = (handler) => async (req, res) => {
    try {
      await handler(req, res);
    } catch {
      console.error("Feature service unavailable");
      fail(res, 503, "Service is unavailable. Please try again shortly.");
    }
  };
  const validIds = (req, res, next) => {
    if (
      !UUID.test(req.params.id) ||
      (req.params.replyId && !UUID.test(req.params.replyId))
    )
      return fail(res, 400, "Invalid ID format.");
    req.params.id = req.params.id.toLowerCase();
    if (req.params.replyId)
      req.params.replyId = req.params.replyId.toLowerCase();
    next();
  };
  const secret = (name) => (req, res, next) => {
    if (
      typeof env[name] !== "string" ||
      env[name].length < 32 ||
      env[name] === env.SUPABASE_SERVICE_ROLE ||
      (name === "REPORT_HASH_SECRET" && env[name] === env.DELETE_KEY_PEPPER) ||
      (name === "POKE_HASH_SECRET" &&
        (env[name] === env.DELETE_KEY_PEPPER ||
          env[name] === env.REPORT_HASH_SECRET))
    ) {
      console.error(`${name} is not configured`);
      return fail(
        res,
        503,
        "This feature is unavailable. Please try again shortly.",
      );
    }
    next();
  };
  const quota =
    (scope, limits, perTarget = false) =>
    async (req, res, next) => {
      try {
        const result = await consumeSharedRateLimit({
          env,
          getDatabase,
          scope: perTarget ? `${scope}:${req.params.id}` : scope,
          client: req.ip,
          ...limits,
        });
        if (!result.allowed) {
          res.set("Retry-After", String(result.retry_after || 60));
          return fail(
            res,
            429,
            "Too many attempts. Please wait before trying again.",
          );
        }
        next();
      } catch {
        fail(res, 503, "Service is unavailable. Please try again shortly.");
      }
    };
  const keyBody = (req, res, next) => {
    const key =
      typeof req.body?.key === "string"
        ? req.body.key.trim().toUpperCase()
        : "";
    if (!KEY_PATTERN.test(key))
      return fail(res, 400, "Enter a valid delete key.");
    req.deleteKey = key;
    next();
  };
  const authorGuards = [
    validIds,
    keyBody,
    secret("DELETE_KEY_PEPPER"),
    quota("author-client", config.deletePerClient),
    quota("author-target", config.deletePerTarget, true),
  ];
  const author = async (req) => {
    const { data, error } = await getDatabase()
      .from("confessions")
      .select("delete_key_hash")
      .eq("id", req.params.id)
      .limit(1);
    if (error) throw error;
    return matchesDeleteKey(
      req.deleteKey,
      data?.[0]?.delete_key_hash,
      env.DELETE_KEY_PEPPER,
    );
  };
  const parent = async (id) => {
    const { data, error } = await getDatabase()
      .from("confessions")
      .select("id,allow_replies")
      .eq("id", id)
      .eq("is_hidden", false)
      .limit(1);
    if (error) throw error;
    return data?.[0];
  };

  app.post(
    "/api/confessions/:id/author",
    ...authorGuards,
    safe(async (req, res) => {
      if (!(await author(req)))
        return fail(res, 403, "That key doesn't match.");
      res.json({ status: "success" });
    }),
  );
  app.post(
    "/api/confessions/:id/delete",
    ...authorGuards,
    safe(async (req, res) => {
      if (!(await author(req)))
        return fail(res, 403, "That key doesn't match.");
      const { error } = await getDatabase()
        .from("confessions")
        .delete()
        .eq("id", req.params.id);
      if (error) throw error;
      res.json({ status: "success" });
    }),
  );
  app.post(
    "/api/confessions/:id/replies/:replyId/delete",
    ...authorGuards,
    safe(async (req, res) => {
      if (!(await author(req)))
        return fail(res, 403, "That key doesn't match.");
      const { error } = await getDatabase()
        .from("replies")
        .delete()
        .eq("id", req.params.replyId)
        .eq("confession_id", req.params.id);
      if (error) throw error;
      res.json({ status: "success" });
    }),
  );
  app.get(
    "/api/confessions/:id/settings",
    validIds,
    readLimiter,
    safe(async (req, res) => {
      const item = await parent(req.params.id);
      if (!item) return fail(res, 404, "Confession not found.");
      res.json({ allowReplies: item.allow_replies });
    }),
  );
  app.get(
    "/api/confessions/:id/replies",
    validIds,
    readLimiter,
    safe(async (req, res) => {
      const item = await parent(req.params.id);
      if (!item) return fail(res, 404, "Confession not found.");
      if (!item.allow_replies) return res.json([]);
      const { data, error } = await getDatabase().rpc("visible_song_replies", {
        p_id: req.params.id,
      });
      if (error) throw error;
      res.json(data || []);
    }),
  );
  app.post(
    "/api/confessions/:id/replies",
    validIds,
    quota("reply-client", config.repliesPerClient),
    quota("reply-target", config.repliesPerTarget, true),
    safe(async (req, res) => {
      const { song, note } = req.body || {};
      if (
        !song ||
        typeof song.id !== "string" ||
        !/^[a-zA-Z0-9]{22}$/.test(song.id) ||
        (note !== undefined &&
          (typeof note !== "string" || note.trim().length > 140))
      )
        return fail(
          res,
          400,
          "Choose a valid song and a note of at most 140 characters.",
        );
      const item = await parent(req.params.id);
      if (!item) return fail(res, 404, "Confession not found.");
      if (!item.allow_replies)
        return fail(res, 409, "Song replies are turned off.");
      let track;
      try {
        track = await verifiedTrack(song.id, spotify, getToken);
      } catch (error) {
        return fail(
          res,
          error.status === 400 ? 400 : 503,
          "Could not verify selected song. Please try again.",
        );
      }
      const { data, error } = await getDatabase().rpc("add_song_reply", {
        p_parent: req.params.id,
        p_track: track,
        p_note: note?.trim() || null,
        p_cap: config.maxReplies,
      });
      if (error) throw error;
      if (data === "missing") return fail(res, 404, "Confession not found.");
      if (data === "disabled")
        return fail(res, 409, "Song replies are turned off.");
      if (data === "full")
        return fail(
          res,
          409,
          "This confession has reached its 20-reply limit.",
        );
      if (data !== "created") throw new Error("Invalid reply response");
      res.json({ status: "success" });
    }),
  );

  app.post(
    "/api/reports",
    secret("REPORT_HASH_SECRET"),
    quota("report-client", config.reportsPerClient),
    safe(async (req, res) => {
      const {
        targetType,
        targetId: rawId,
        reason: rawReason,
        details,
      } = req.body || {};
      const targetId =
        typeof rawId === "string" ? rawId.trim().toLowerCase() : rawId;
      const reason =
        typeof rawReason === "string" ? rawReason.trim() : rawReason;
      if (
        !["confession", "reply"].includes(targetType) ||
        typeof targetId !== "string" ||
        !UUID.test(targetId) ||
        !config.reportReasons.includes(reason) ||
        (details !== undefined &&
          (typeof details !== "string" || details.trim().length > 300))
      )
        return fail(
          res,
          400,
          "Provide a valid target, reason and details of at most 300 characters.",
        );
      const hash = reporterHash(req.ip, env.REPORT_HASH_SECRET);
      const { data, error } = await getDatabase().rpc("submit_content_report", {
        p_target_type: targetType,
        p_target_id: targetId,
        p_reason: reason,
        p_details: details?.trim() || null,
        p_reporter_hash: hash,
        p_threshold: config.autoHideReports,
        p_urgent: config.reviewReasons.includes(reason),
      });
      if (error) throw error;
      if (
        data?.notify &&
        UUID.test(data.confession_id) &&
        env.ADMIN_WEBHOOK_URL
      ) {
        const notify = async () => {
          try {
            const url = new URL(env.ADMIN_WEBHOOK_URL);
            if (
              url.protocol !== "https:" ||
              !["discord.com", "discordapp.com"].includes(url.hostname) ||
              !url.pathname.startsWith("/api/webhooks/")
            )
              return;
            await webhook(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: `Moderation review: ${reason}; ${targetType}; confession ${data.confession_id}; https://dssconfessions.vercel.app/confession/${data.confession_id}`,
                allowed_mentions: { parse: [] },
              }),
              signal: AbortSignal.timeout(4000),
            });
          } catch {
            /* Notifications never affect the public report response. */
          }
        };
        const task = notify();
        try {
          background(task);
        } catch {
          /* Best effort. */
        }
      }
      res.json({ status: "success" });
    }),
  );

  app.post(
    "/api/confessions/:id/poke",
    validIds,
    quota("poke", config.pokesPerClient),
    safe(async (req, res) => {
      let amount = 1;
      if (req.body && req.body.amount !== undefined) {
        amount = req.body.amount;
        if (
          typeof amount !== "number" ||
          !Number.isInteger(amount) ||
          amount < 1 ||
          amount > 100
        ) {
          return fail(
            res,
            400,
            "Poke amount must be an integer between 1 and 100.",
          );
        }
      }

      const { data, error } = await getDatabase().rpc("poke_confession", {
        p_confession_id: req.params.id,
        p_amount: amount,
      });

      if (error) {
        if (
          error.code === "P0002" ||
          String(error.message || "").includes("Confession not found")
        ) {
          return fail(res, 404, "Confession not found.");
        }
        throw error;
      }

      if (data === null || data === undefined) {
        return fail(res, 404, "Confession not found.");
      }

      const count =
        typeof data === "object" && data !== null ? data.poke_count : data;
      res.json({
        count: Number(count) || 0,
      });
    }),
  );
}
module.exports = { mountFeatures, UUID };
