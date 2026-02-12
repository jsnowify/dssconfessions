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
// This allows both your local testing and your live Vercel site to talk to this API
const allowedOrigins = [
  "http://localhost:5173",
  "https://dssconfessions.vercel.app", // Update this if your Vercel URL is different
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Rate Limiter: Protects your Supabase quota from spam
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many confessions. Please wait 15 minutes." },
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE, // Ensure this is the SECRET key in Render
);

// --- SPOTIFY ACCESS LOGIC ---
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

// --- API ROUTES ---

app.post("/api/confess", postLimiter, async (req, res) => {
  const { to, from, content, song } = req.body;

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

  if (error) return res.status(500).json({ error: "Database failure" });
  res.status(200).json("Success");
});

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

app.get("/api/confessions", async (req, res) => {
  const { data, error } = await supabase
    .from("confessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: "Fetch failed" });
  res.json(data);
});

// Render provides the PORT dynamically; default to 5000 for local testing
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
