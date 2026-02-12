const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-filters");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- PRODUCTION CORS CONFIGURATION ---
// Whitelisting your specific Vercel URL and allowing subdomains for previews
const allowedOrigins = [
  "http://localhost:5173",
  "https://dssconfessions.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or direct browser API checks)
      if (!origin) return callback(null, true);

      const isAllowedVercel = origin.endsWith(".vercel.app");
      const isLocal = origin === "http://localhost:5173";

      if (allowedOrigins.indexOf(origin) !== -1 || isAllowedVercel || isLocal) {
        callback(null, true);
      } else {
        console.error(`CORS Blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Rate Limiter: Protects your Supabase quota from spam
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // Slightly increased for testing
  message: { error: "Too many confessions. Please wait 15 minutes." },
});

// Initialize Supabase
// Ensure these variables are set in your Render "Environment Variables" dashboard
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
);

// --- SPOTIFY ACCESS LOGIC ---
const getSpotifyToken = async () => {
  const auth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Spotify Token Error:", error.message);
    throw error;
  }
};

// --- API ROUTES ---

// 1. Welcome Route (To avoid "Cannot GET /" message)
app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "DSSC API is live",
    frontend: "https://dssconfessions.vercel.app",
  });
});

// 2. Post Confession
app.post("/api/confess", postLimiter, async (req, res) => {
  const { to, from, content, song } = req.body;

  // XSS Filtering for security
  const cleanTo = xss.inHTMLData(to).substring(0, 50);
  const cleanFrom = xss.inHTMLData(from || "Anonymous").substring(0, 50);
  const cleanContent = xss.inHTMLData(content).substring(0, 500);

  const { error } = await supabase.from("confessions").insert([
    {
      recipient_to: cleanTo,
      sender_from: cleanFrom,
      content: cleanContent,
      song_name: song?.name,
      artist_name: song?.artists[0]?.name,
      album_art: song?.album?.images[0]?.url,
      spotify_url: song?.external_urls?.spotify,
    },
  ]);

  if (error) {
    console.error("Supabase Insert Error:", error);
    return res.status(500).json({ error: "Database failure" });
  }
  res.status(200).json("Success");
});

// 3. Search Spotify Songs
app.get("/api/search-song", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const query = req.query.q;
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    res.json(response.data.tracks.items);
  } catch (err) {
    res.status(500).json({ error: "Spotify search failed" });
  }
});

// 4. Get Confessions (Fetch Feed)
app.get("/api/confessions", async (req, res) => {
  const { data, error } = await supabase
    .from("confessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: "Fetch failed" });
  res.json(data);
});

// Render provides the PORT dynamically
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend live on port ${PORT}`);
});
