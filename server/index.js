const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const { getSpotifyToken } = require("./utils/spotify");
const { validateConfessionInput } = require("./utils/validation");

// --- Fail fast if required env vars are missing ---
const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE",
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(
    `FATAL: Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
  process.exit(1);
}

const app = express();

// --- RENDER/PRODUCTION FIX ---
// Essential for express-rate-limit to work behind Render's reverse proxy
app.set("trust proxy", 1);

// --- STRICT CORS CONFIGURATION ---
// Only exact, known origins are allowed. Previously any "*.vercel.app"
// domain was allowed, which meant anyone could deploy a clone/scraper
// on Vercel and it would pass CORS. Add additional exact origins here
// (e.g. a staging URL) instead of using a wildcard suffix match.
const allowedOrigins = [
  "http://localhost:5173",
  "https://dssconfessions.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow same-origin / server-to-server requests with no Origin header
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`CORS Blocked for origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// --- Rate limiters ---
// Submitting confessions: strict, since each is a write.
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many confessions. Please wait 15 minutes." },
});

// Reading/searching: looser, but still capped. Previously these routes
// had NO rate limit at all, leaving Spotify/Supabase quotas exposed.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
);

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ status: "online", frontend: "https://dssconfessions.vercel.app" });
});

app.post("/api/confess", postLimiter, async (req, res) => {
  const { valid, errors, data } = validateConfessionInput(req.body);
  if (!valid) {
    return res
      .status(400)
      .json({ error: "Invalid submission", details: errors });
  }

  // --- Verify the song server-side instead of trusting the client payload ---
  // Previously the client could POST arbitrary song_name / artist_name /
  // album_art (any image URL) / spotify_url directly, bypassing search
  // entirely. We now only trust the song ID and re-fetch the real track
  // details from Spotify ourselves.
  let track;
  try {
    const token = await getSpotifyToken();
    const trackRes = await axios.get(
      `https://api.spotify.com/v1/tracks/${encodeURIComponent(data.songId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      },
    );
    track = trackRes.data;
  } catch (err) {
    console.error("Spotify track verification failed:", err.message);
    return res.status(400).json({ error: "Could not verify selected song." });
  }

  const { error } = await supabase.from("confessions").insert([
    {
      recipient_to: data.recipient_to,
      sender_from: data.sender_from,
      content: data.content,
      song_name: track?.name ?? "Unknown Track",
      artist_name: track?.artists?.[0]?.name ?? "Unknown Artist",
      album_art: track?.album?.images?.[0]?.url ?? null,
      spotify_url: track?.external_urls?.spotify ?? null,
    },
  ]);

  if (error) {
    console.error("Supabase insert failed:", error.message);
    return res.status(500).json({ error: "Database failure" });
  }

  res.status(200).json({ status: "success" });
});

app.get("/api/search-song", readLimiter, async (req, res) => {
  const q = req.query.q;
  if (!q || typeof q !== "string" || q.trim().length === 0) {
    return res.status(400).json({ error: "Missing search query." });
  }

  try {
    const token = await getSpotifyToken();
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      },
    );
    res.json(response.data.tracks.items);
  } catch (err) {
    console.error("Spotify search failed:", err.message);
    res.status(500).json({ error: "Spotify search failed" });
  }
});

app.get("/api/confessions", readLimiter, async (req, res) => {
  const { to } = req.query;
  let query = supabase.from("confessions").select("*");

  if (to && typeof to === "string" && to.trim().length > 0) {
    // Cap search results too — previously unlimited, so a common name
    // could return the entire table.
    query = query
      .ilike("recipient_to", `%${to.trim().slice(0, 50)}%`)
      .order("created_at", { ascending: false })
      .limit(50);
  } else {
    query = query.order("created_at", { ascending: false }).limit(20);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase fetch failed:", error.message);
    return res.status(500).json({ error: "Fetch failed" });
  }
  res.json(data);
});

// --- Fallback error handler (avoid leaking stack traces in production) ---
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV !== "production" ? { detail: err.message } : {}),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server live on port ${PORT}`));
