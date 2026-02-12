const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-filters");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- RENDER/PRODUCTION FIX ---
// Essential for express-rate-limit to work behind Render's reverse proxy
app.set("trust proxy", 1);

// --- PRODUCTION CORS CONFIGURATION ---
const allowedOrigins = [
  "http://localhost:5173",
  "https://dssconfessions.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
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

// Rate Limiter: Protects your Supabase quota and ensures fair usage
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many confessions. Please wait 15 minutes." },
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
);

const getSpotifyToken = async () => {
  const auth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");
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
};

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ status: "online", frontend: "https://dssconfessions.vercel.app" });
});

app.post("/api/confess", postLimiter, async (req, res) => {
  const { to, from, content, song } = req.body;
  const { error } = await supabase.from("confessions").insert([
    {
      recipient_to: xss.inHTMLData(to).substring(0, 50),
      sender_from: xss.inHTMLData(from || "Anonymous").substring(0, 50),
      content: xss.inHTMLData(content).substring(0, 500),
      song_name: song?.name,
      artist_name: song?.artists[0]?.name,
      album_art: song?.album?.images[0]?.url,
      spotify_url: song?.external_urls?.spotify,
    },
  ]);
  if (error) return res.status(500).json({ error: "Database failure" });
  res.status(200).json("Success");
});

app.get("/api/search-song", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(req.query.q)}&type=track&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    res.json(response.data.tracks.items);
  } catch (err) {
    res.status(500).json({ error: "Spotify search failed" });
  }
});

app.get("/api/confessions", async (req, res) => {
  const { to } = req.query;
  let query = supabase.from("confessions").select("*");
  if (to) {
    query = query.ilike("recipient_to", `%${to}%`);
  } else {
    query = query.order("created_at", { ascending: false }).limit(20);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: "Fetch failed" });
  res.json(data);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server live on port ${PORT}`));
