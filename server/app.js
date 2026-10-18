const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const helmet = require("helmet");
const cors = require("cors");
const axios = require("axios");
const { getSpotifyToken } = require("./utils/spotify");
const { validateConfessionInput } = require("./utils/validation");
const { createLimiter } = require("./utils/rate-limit");
const { createSearchTracker } = require("./utils/search-trends");
const {
  generateDeleteKey,
  hashDeleteKey,
  isDeleteKeyConfigured,
} = require("./utils/delete-key");
const { verifiedTrack } = require("./utils/verified-track");
const { mountFeatures } = require("./features");
const { mountOg } = require("./og");
const {
  databaseContext,
  instrumentDatabase,
} = require("./utils/database-diagnostics");
const { readVisibleConfessions } = require("./utils/visible-confessions");

const PUBLIC_COLUMNS =
  "id,recipient_to,sender_from,content,song_name,artist_name,album_art,spotify_url,created_at,poke_count";
const LEGACY_PUBLIC_COLUMNS =
  "id,recipient_to,sender_from,content,song_name,artist_name,album_art,spotify_url,created_at";

function createApp({
  env = process.env,
  database,
  spotify = axios,
  getToken = getSpotifyToken,
  background,
  webhook,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  let client = database ? instrumentDatabase(database) : null;
  const getDatabase = () => {
    if (client) return client;
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE)
      throw new Error("Database configuration is missing");
    client = instrumentDatabase(
      createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: (url, options = {}) =>
            fetch(url, {
              ...options,
              signal: options.signal
                ? AbortSignal.any([options.signal, AbortSignal.timeout(8000)])
                : AbortSignal.timeout(8000),
            }),
        },
      }),
    );
    return client;
  };

  const trackSearch = createSearchTracker({ env, getDatabase, background });

  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "https://dssconfessions.vercel.app",
    ...(env.CLIENT_URL ? [env.CLIENT_URL] : []),
    ...(env.ALLOWED_ORIGIN ? [env.ALLOWED_ORIGIN] : []),
    ...(env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : []),
  ]);
  app.use(helmet());
  app.use(databaseContext);
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        const error = new Error("Not allowed by CORS");
        error.status = 403;
        callback(error);
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "10kb" }));

  const postLimiter = createLimiter({
    env,
    getDatabase,
    scope: "confess",
    windowMs: 900000,
    limit: 15,
    message: "Too many confessions. Please wait 15 minutes.",
  });
  const readLimiter = createLimiter({
    env,
    getDatabase,
    scope: "read",
    windowMs: 60000,
    limit: 60,
    message: "Too many requests. Please slow down.",
  });

  app.get("/", (req, res) => res.json({ status: "online" }));
  app.get("/api/health", async (req, res) => {
    let databaseStatus = "unavailable";
    try {
      const { error } = await readVisibleConfessions(getDatabase, (visible) => {
        let query = getDatabase().from("confessions").select("id");
        if (visible) query = query.eq("is_hidden", false);
        return query.limit(1);
      });
      if (!error) databaseStatus = "ok";
    } catch {
      /* Report availability without leaking upstream errors. */
    }
    const spotifyStatus =
      env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET
        ? "configured"
        : "missing";
    const postingStatus = isDeleteKeyConfigured(env)
      ? "configured"
      : "unavailable";
    const ready =
      databaseStatus === "ok" &&
      spotifyStatus === "configured" &&
      postingStatus === "configured";
    return res.status(ready ? 200 : 503).json({
      status: ready ? "ok" : "degraded",
      database: databaseStatus,
      spotify: spotifyStatus,
      posting: postingStatus,
    });
  });

  app.post("/api/confess", postLimiter, async (req, res) => {
    const { valid, errors, data } = validateConfessionInput(req.body);
    if (!valid)
      return res
        .status(400)
        .json({ error: "Invalid submission", details: errors });
    if (
      req.body.allowReplies !== undefined &&
      typeof req.body.allowReplies !== "boolean"
    )
      return res
        .status(400)
        .json({ error: "Allow replies must be a boolean." });
    if (!isDeleteKeyConfigured(env)) {
      console.error("DELETE_KEY_PEPPER is not configured independently");
      return res
        .status(503)
        .json({ error: "Posting is unavailable. Please try again shortly." });
    }
    let track;
    try {
      track = await verifiedTrack(data.songId, spotify, getToken);
    } catch (error) {
      return res.status(error.status === 400 ? 400 : 503).json({
        error: "Song verification is unavailable. Please try again shortly.",
      });
    }
    try {
      const deleteKey = generateDeleteKey();
      const { spotify_track_id, ...songColumns } = track;
      void spotify_track_id;
      const { error } = await getDatabase()
        .from("confessions")
        .insert([
          {
            recipient_to: data.recipient_to,
            sender_from: data.sender_from,
            content: data.content,
            ...songColumns,
            allow_replies: req.body.allowReplies ?? true,
            delete_key_hash: hashDeleteKey(deleteKey, env.DELETE_KEY_PEPPER),
          },
        ]);
      if (error) throw error;
      return res.json({ status: "success", deleteKey });
    } catch {
      return res
        .status(503)
        .json({ error: "Saving is unavailable. Please try again shortly." });
    }
  });

  app.get("/api/search-song", readLimiter, async (req, res) => {
    const { q } = req.query;
    if (typeof q !== "string" || !q.trim() || q.length > 200) {
      return res
        .status(400)
        .json({ error: "Provide a search query of 1–200 characters." });
    }
    try {
      const token = await getToken();
      const response = await spotify.get("https://api.spotify.com/v1/search", {
        params: { q: q.trim(), type: "track", limit: 5 },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      res.set("Cache-Control", "public, max-age=0, s-maxage=60");
      return res.json(response.data?.tracks?.items || []);
    } catch (error) {
      console.error(
        "Spotify search unavailable:",
        error.code || error.response?.status || "upstream error",
      );
      return res.status(503).json({
        error: "Song search is unavailable. Please try again shortly.",
      });
    }
  });

  app.get("/api/top-searches", readLimiter, async (req, res) => {
    const rawLimit = req.query.limit;
    const limit =
      typeof rawLimit === "string" && /^\d+$/.test(rawLimit)
        ? Math.min(20, Math.max(1, Number(rawLimit)))
        : 8;
    try {
      const { data, error } = await getDatabase().rpc("visible_top_searches", {
        p_limit: limit,
      });
      if (error) throw error;
      return res.json(data || []);
    } catch {
      return res
        .status(503)
        .json({ error: "Trending searches are unavailable." });
    }
  });

  app.get("/api/confessions", readLimiter, async (req, res) => {
    try {
      const { to, id } = req.query;
      if (to !== undefined && typeof to !== "string") {
        return res
          .status(400)
          .json({ error: "Recipient must be a single search string." });
      }
      if (id !== undefined && typeof id !== "string") {
        return res
          .status(400)
          .json({ error: "Confession ID must be a single string." });
      }
      const buildQuery = (visible, options = {}) => {
        const isVis =
          typeof visible === "boolean" ? visible : visible?.visible !== false;
        const withPoke =
          options?.withPoke !== false &&
          (typeof visible !== "object" || visible?.withPoke !== false);
        const cols = withPoke ? PUBLIC_COLUMNS : LEGACY_PUBLIC_COLUMNS;
        let query = getDatabase().from("confessions").select(cols);
        if (isVis) query = query.eq("is_hidden", false);
        if (id?.trim()) {
          const cleanId = id.trim();
          query = query.eq("id", cleanId).limit(1);
        } else if (to?.trim()) {
          const search = to
            .trim()
            .slice(0, 50)
            .replace(/[\\%_]/g, "\\$&");
          query = query
            .ilike("recipient_to", `%${search}%`)
            .order("created_at", { ascending: false })
            .limit(50);
        } else {
          query = query.order("created_at", { ascending: false }).limit(20);
        }
        return query;
      };
      // Validate before executing either the filtered or legacy read.
      if (
        id?.trim() &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id.trim(),
        )
      ) {
        return res.status(400).json({ error: "Invalid confession ID format." });
      }
      const { data, error } = await readVisibleConfessions(
        getDatabase,
        buildQuery,
      );
      if (error) {
        return res.status(503).json({
          error: "Stories are unavailable. Please try again shortly.",
        });
      }
      // Moderated reads stay uncached so hidden stories cannot survive in the CDN.
      if (data?.length && to?.trim()) trackSearch(req.ip, to);
      return res.json(data || []);
    } catch {
      return res
        .status(503)
        .json({ error: "Stories are unavailable. Please try again shortly." });
    }
  });

  mountFeatures(app, {
    env,
    getDatabase,
    spotify,
    getToken,
    background,
    readLimiter,
    webhook,
  });
  mountOg(app, { getDatabase, readLimiter });

  app.use((req, res) => res.status(404).json({ error: "API route not found" }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.status >= 400 && error.status < 500 ? error.status : 503;
    console.error("API request failed:", error.type || error.code || status);
    return res.status(status).json({
      error:
        status === 400
          ? "Invalid JSON body"
          : status === 413
            ? "Request body is too large"
            : status === 403
              ? "Origin is not allowed"
              : "Service is unavailable. Please try again shortly.",
    });
  });
  return app;
}

module.exports = { createApp };
