const { UUID } = require("./features");
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

function mountOg(app, { getDatabase, readLimiter }) {
  app.get(
    ["/api/og/confessions/:id", "/confession/:id"],
    (req, res, next) => {
      if (!UUID.test(req.params.id))
        return res.status(400).json({ error: "Invalid ID format." });
      next();
    },
    readLimiter,
    async (req, res) => {
      const id = req.params.id;
      if (!UUID.test(id))
        return res.status(400).json({ error: "Invalid ID format." });
      try {
        const { data, error } = await getDatabase().rpc("confession_preview", {
          p_id: id,
        });
        if (error) throw error;
        const item = data?.[0];
        const safe = Boolean(item);
        const title = safe
          ? `A confession for ${item.recipient_to}`
          : "dssconfessions";
        const description = safe
          ? `Someone sent a song to ${item.recipient_to}`
          : "Untold words, sent through the song.";
        const link = `https://dssconfessions.vercel.app/confession/${id}`;
        const redirect = `${link}?_spa=1`;
        // Ephemeral crawler detection only; no user agent is stored or logged.
        const crawler =
          /bot|crawler|spider|facebookexternalhit|whatsapp|slack|preview/i.test(
            req.get("user-agent") || "",
          );
        const refresh = crawler
          ? ""
          : `<meta http-equiv="refresh" content="0;url=${redirect}">`;
        res.set("X-Robots-Tag", "noindex, nofollow");
        res.vary("User-Agent");
        res.set(
          "Content-Security-Policy",
          "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        );
        return res
          .type("html")
          .send(
            `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="robots" content="noindex,nofollow"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${link}"><meta property="og:image" content="https://dssconfessions.vercel.app/og-record-shop.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="https://dssconfessions.vercel.app/og-record-shop.png">${refresh}</head><body><a href="${redirect}">Open dssconfessions</a></body></html>`,
          );
      } catch {
        return res.status(503).json({ error: "Link preview is unavailable." });
      }
    },
  );
}
module.exports = { mountOg };
