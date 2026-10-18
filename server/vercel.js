const { waitUntil } = require("@vercel/functions");
const { createApp } = require("./app");

// Keep best-effort trend writes alive after sending the search response.
module.exports = createApp({ background: waitUntil });
