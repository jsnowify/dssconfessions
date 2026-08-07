const axios = require("axios");

// --- Module-level token cache ---
// Spotify client-credentials tokens last ~1 hour. We cache it in memory
// and only refetch when it's actually expired (with a small safety margin).
let cachedToken = null;
let tokenExpiresAt = 0; // epoch ms

const fetchNewToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET env vars",
    );
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 8000,
    },
  );

  const { access_token, expires_in } = response.data;
  cachedToken = access_token;
  // Refresh 60s before actual expiry to avoid edge-of-expiry failures
  tokenExpiresAt = Date.now() + (expires_in - 60) * 1000;
  return cachedToken;
};

const getSpotifyToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  return fetchNewToken();
};

module.exports = { getSpotifyToken };
