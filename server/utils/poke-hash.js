const { createHmac } = require("node:crypto");
const { ipKeyGenerator } = require("express-rate-limit");

function pokerHash(ip, secret, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const normalized =
    typeof ipKeyGenerator === "function" ? ipKeyGenerator(ip) : String(ip || "");
  return createHmac("sha256", secret)
    .update(JSON.stringify(["poke", normalized, today]))
    .digest("hex");
}

module.exports = { pokerHash };
