const { randomBytes, createHmac, timingSafeEqual } = require("node:crypto");
const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const KEY_PATTERN =
  /^DSS-(?:[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-){3}[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

function generateDeleteKey() {
  let letters = "";
  while (letters.length < 16) {
    for (const byte of randomBytes(24)) {
      if (byte < 248 && letters.length < 16)
        letters += alphabet[byte % alphabet.length];
    }
  }
  return `DSS-${letters.match(/.{4}/g).join("-")}`;
}
function hashDeleteKey(key, pepper) {
  if (typeof pepper !== "string" || pepper.length < 32)
    throw new Error("Delete key service unavailable");
  return createHmac("sha256", pepper).update(key).digest("hex");
}
function matchesDeleteKey(key, storedHash, pepper) {
  const candidate = Buffer.from(hashDeleteKey(key, pepper), "hex");
  const valid =
    typeof storedHash === "string" && /^[a-f0-9]{64}$/.test(storedHash);
  const stored = Buffer.from(valid ? storedHash : "0".repeat(64), "hex");
  return timingSafeEqual(candidate, stored) && valid;
}
module.exports = {
  generateDeleteKey,
  hashDeleteKey,
  matchesDeleteKey,
  KEY_PATTERN,
};
