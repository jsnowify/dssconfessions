const { consumeSharedRateLimit } = require("./rate-limit");

function createSearchTracker({ env = process.env, getDatabase, background = () => {} }) {

  return (ip, rawTerm) => {
    const term = typeof rawTerm === "string" ? rawTerm.trim().toLowerCase() : "";
    if (term.length < 2 || term.length > 40) return;
    const increment = async () => {
      try {
        // Reuse the atomic shared quota even locally: never fall back to a
        // process-local counter. Only an HMAC key with a ten-minute TTL is sent.
        const quota = await consumeSharedRateLimit({
          env, getDatabase, scope: JSON.stringify(["search-trend", term]),
          client: ip, windowMs: 600000, limit: 1,
        });
        if (!quota.allowed) return;
        const { error } = await getDatabase().rpc("increment_search_term", { p_term: term });
        if (error) return;
      } catch {
        // Trends are optional: never log search terms, IPs or upstream errors.
      }
    };
    const task = increment();
    try {
      // Vercel keeps the invocation alive without delaying the response.
      background(task);
    } catch {
      // A platform scheduling failure must not affect the recipient search.
    }
  };
}

module.exports = { createSearchTracker };
