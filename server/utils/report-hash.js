const { createHmac } = require("node:crypto");
const { ipKeyGenerator } = require("express-rate-limit");
function reporterHash(ip, secret, date = new Date()) {
  return createHmac("sha256", secret)
    .update(
      JSON.stringify([ipKeyGenerator(ip), date.toISOString().slice(0, 10)]),
    )
    .digest("hex");
}
module.exports = { reporterHash };
