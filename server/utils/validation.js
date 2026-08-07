// --- Validation helpers for /api/confess ---
// We validate + trim + length-cap here instead of HTML-escaping, because
// the stored content is only ever rendered through React (auto-escapes)
// or drawn onto a <canvas> (not HTML at all). Escaping it on the way in
// just corrupts the text (e.g. "it's" -> "it&#39;s") permanently in the DB.

const isNonEmptyString = (val) =>
  typeof val === "string" && val.trim().length > 0;

const clean = (val, maxLen) =>
  typeof val === "string" ? val.trim().slice(0, maxLen) : "";

/**
 * Validates and normalizes the body of a POST /api/confess request.
 * Returns { valid: boolean, errors: string[], data: {...} }
 */
const validateConfessionInput = (body) => {
  const errors = [];
  const { to, from, content, song } = body || {};

  if (!isNonEmptyString(to)) errors.push("Recipient ('to') is required.");
  if (!isNonEmptyString(content))
    errors.push("Confession content is required.");
  if (typeof content === "string" && content.trim().length > 500) {
    errors.push("Confession content must be 500 characters or fewer.");
  }
  if (typeof to === "string" && to.trim().length > 50) {
    errors.push("Recipient name must be 50 characters or fewer.");
  }

  if (!song || typeof song !== "object") {
    errors.push("A song selection is required.");
  } else if (!isNonEmptyString(song.id)) {
    errors.push("Song is missing a valid id.");
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  return {
    valid: true,
    errors: [],
    data: {
      recipient_to: clean(to, 50),
      sender_from: isNonEmptyString(from) ? clean(from, 50) : "Anonymous",
      content: clean(content, 500),
      songId: song.id,
    },
  };
};

module.exports = { validateConfessionInput };
