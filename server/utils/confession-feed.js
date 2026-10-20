const { sharedRateLimitParams } = require("./rate-limit");

function parseFeedQuery({ to, id, latest, before, limit }) {
  if (latest !== undefined && latest !== "1")
    return { error: "Invalid latest-post check." };
  if (to !== undefined && typeof to !== "string")
    return { error: "Recipient must be a single search string." };
  if (id !== undefined && typeof id !== "string")
    return { error: "Confession ID must be a single string." };
  if (before !== undefined && (
    typeof before !== "string" || !before.trim() || isNaN(Date.parse(before))
  )) return { error: "Invalid before cursor timestamp." };
  if (id?.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim()))
    return { error: "Invalid confession ID format." };
  const parsedLimit = typeof limit === "string" && /^\d+$/.test(limit)
    ? Math.min(50, Math.max(1, Number(limit)))
    : latest === "1" ? 1 : to?.trim() ? 50 : 20;
  return { to, id, latest, before, parsedLimit };
}

function recipientPattern(to) {
  return to?.trim() ? `%${to.trim().slice(0, 50).replace(/[\\%_]/g, "\\$&")}%` : null;
}

function createFeedLimiter({ env, getDatabase, readLimiter, quota }) {
  if (env.VERCEL !== "1" && env.RATE_LIMIT_STORE !== "supabase") return readLimiter;
  return async (req, res, next) => {
    const selection = parseFeedQuery(req.query);
    req.feedSelection = selection;
    // Malformed requests still consume the shared read quota before returning 400.
    if (selection.error) return readLimiter(req, res, next);
    try {
      const params = sharedRateLimitParams({ env, ...quota, client: req.ip });
      const { data, error } = await getDatabase().rpc("read_confession_feed", {
        p_key: params.p_key,
        p_window_seconds: params.p_window_seconds,
        p_read_limit: params.p_limit,
        p_id: selection.id?.trim() || null,
        p_search: recipientPattern(selection.to),
        p_before: selection.before ? new Date(selection.before.trim()).toISOString() : null,
        p_latest: selection.latest === "1",
        p_page_limit: selection.parsedLimit,
      });
      if (error) {
        // A missing RPC or optional schema rolls back its transaction, including
        // the quota increment. Older databases can safely use the original path.
        if (["PGRST202", "42883", "42703", "42P01"].includes(error.code))
          return readLimiter(req, res, next);
        throw new Error("Feed read unavailable");
      }
      if (typeof data?.allowed !== "boolean") throw new Error("Invalid feed quota");
      if (!data.allowed) {
        res.set("Retry-After", String(data.retry_after));
        return res.status(429).json({ error: quota.message });
      }
      if (!Array.isArray(data.confessions)) throw new Error("Invalid feed data");
      req.feedRows = data.confessions;
      return next();
    } catch {
      return res.status(503).json({ error: "Service is unavailable. Please try again shortly." });
    }
  };
}

module.exports = { parseFeedQuery, recipientPattern, createFeedLimiter };
