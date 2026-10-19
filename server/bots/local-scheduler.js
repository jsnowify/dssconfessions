// Development server only. Job state, due times and overlap protection remain
// in PostgreSQL; this timer is just an authenticated wake-up signal.
function startLocalScheduler({ env, port, request = fetch, intervalMs = 60000 }) {
  if (env.BOT_LOCAL_SCHEDULER !== "1" || env.VERCEL === "1") return () => {};
  if (typeof env.CRON_SECRET !== "string" || env.CRON_SECRET.length < 32) {
    console.error("[confession-bot] Local scheduler needs its own cron secret.");
    return () => {};
  }
  const tick = async () => {
    try {
      const response = await request(`http://127.0.0.1:${port}/api/cron/confession-bots`, {
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
        signal: AbortSignal.timeout(40000),
      });
      const result = await response.json();
      if (!response.ok || !["idle", "busy"].includes(result.state)) {
        console.info("[confession-bot]", JSON.stringify({
          scheduler: "local", status: response.status,
          state: result.state || "unavailable",
        }));
      }
    } catch {
      console.error("[confession-bot] Local scheduler could not reach the API; it will retry.");
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
module.exports = { startLocalScheduler };
