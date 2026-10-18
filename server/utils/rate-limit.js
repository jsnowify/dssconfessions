const { createHmac } = require("node:crypto");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

function createLimiter({ env, getDatabase, scope, windowMs, limit, message }) {
  if (env.VERCEL !== "1" && env.RATE_LIMIT_STORE !== "supabase") {
    return rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });
  }
  return async (req, res, next) => {
    try {
      if (!env.SUPABASE_SERVICE_ROLE) throw new Error("Rate-limit configuration is missing");
      const key = createHmac("sha256", env.SUPABASE_SERVICE_ROLE)
        .update(`${scope}:${ipKeyGenerator(req.ip)}`).digest("hex");
      const { data, error } = await getDatabase().rpc("consume_api_rate_limit", {
        p_key: key, p_window_seconds: windowMs / 1000, p_limit: limit,
      });
      if (error || typeof data?.allowed !== "boolean") throw new Error("Rate-limit store is unavailable");
      if (!data.allowed) {
        res.set("Retry-After", String(data.retry_after));
        return res.status(429).json({ error: message });
      }
      return next();
    } catch {
      return res.status(503).json({ error: "Service is unavailable. Please try again shortly." });
    }
  };
}

module.exports = { createLimiter };
