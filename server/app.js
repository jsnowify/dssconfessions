const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const helmet = require("helmet");
const cors = require("cors");
const axios = require("axios");
const { getSpotifyToken } = require("./utils/spotify");
const { validateConfessionInput } = require("./utils/validation");
const { createLimiter } = require("./utils/rate-limit");

const PUBLIC_COLUMNS =
  "id,recipient_to,sender_from,content,song_name,artist_name,album_art,spotify_url,created_at";

function createApp({
  env = process.env,
  database,
  spotify = axios,
  getToken = getSpotifyToken,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  let client = database;
  const getDatabase = () => {
    if (client) return client;
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE)
      throw new Error("Database configuration is missing");
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
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
    });
    return client;
  };

  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "https://dssconfessions.vercel.app",
    ...(env.CLIENT_URL ? [env.CLIENT_URL] : []),
    ...(env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : []),
  ]);
  app.use(helmet());
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
      const { error } = await getDatabase()
        .from("confessions")
        .select("id")
        .limit(1);
      if (!error) databaseStatus = "ok";
    } catch {
      /* Report availability without leaking upstream errors. */
    }
    const spotifyStatus =
      env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET
        ? "configured"
        : "missing";
    const ready = databaseStatus === "ok" && spotifyStatus === "configured";
    return res.status(ready ? 200 : 503).json({
      status: ready ? "ok" : "degraded",
      database: databaseStatus,
      spotify: spotifyStatus,
    });
  });

  app.post("/api/confess", postLimiter, async (req, res) => {
    const { valid, errors, data } = validateConfessionInput(req.body);
    if (!valid)
      return res
        .status(400)
        .json({ error: "Invalid submission", details: errors });
    let track;
    try {
      const token = await getToken();
      const response = await spotify.get(
        `https://api.spotify.com/v1/tracks/${encodeURIComponent(data.songId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        },
      );
      track = response.data;
      if (
        track?.id !== data.songId ||
        !track.name ||
        !track.artists?.[0]?.name
      ) {
        return res
          .status(400)
          .json({ error: "Could not verify selected song." });
      }
    } catch (error) {
      console.error(
        "Spotify verification unavailable:",
        error.code || error.response?.status || "upstream error",
      );
      return res
        .status(503)
        .json({
          error: "Song verification is unavailable. Please try again shortly.",
        });
    }
    const { error } = await getDatabase()
      .from("confessions")
      .insert([
        {
          recipient_to: data.recipient_to,
          sender_from: data.sender_from,
          content: data.content,
          song_name: track.name,
          artist_name: track.artists[0].name,
          album_art: track.album?.images?.[0]?.url ?? null,
          spotify_url: track.external_urls?.spotify ?? null,
        },
      ]);
    if (error) {
      console.error(
        "Database insert unavailable:",
        error.code || "upstream error",
      );
      return res
        .status(503)
        .json({ error: "Saving is unavailable. Please try again shortly." });
    }
    return res.json({ status: "success" });
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
      return res
        .status(503)
        .json({
          error: "Song search is unavailable. Please try again shortly.",
        });
    }
  });

  app.get("/api/confessions", readLimiter, async (req, res) => {
    const { to } = req.query;
    if (to !== undefined && typeof to !== "string") {
      return res
        .status(400)
        .json({ error: "Recipient must be a single search string." });
    }
    let query = getDatabase().from("confessions").select(PUBLIC_COLUMNS);
    if (to?.trim()) {
      const search = to
        .trim()
        .slice(0, 50)
        .replace(/[\\%_]/g, "\\$&");
      query = query.ilike("recipient_to", `%${search}%`);
    }
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(to?.trim() ? 50 : 20);
    if (error) {
      console.error(
        "Database read unavailable:",
        error.code || "upstream error",
      );
      return res
        .status(503)
        .json({ error: "Stories are unavailable. Please try again shortly." });
    }
    // Only the public, unfiltered feed is cached. Errors and searches stay uncached.
    if (!to?.trim()) res.set("Cache-Control", "public, max-age=0, s-maxage=15");
    return res.json(data || []);
  });

  app.use((req, res) => res.status(404).json({ error: "API route not found" }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.status >= 400 && error.status < 500 ? error.status : 503;
    console.error("API request failed:", error.type || error.code || status);
    return res
      .status(status)
      .json({
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
