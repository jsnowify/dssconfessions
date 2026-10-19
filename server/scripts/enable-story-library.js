// Owner CLI: configure through the same authenticated administration API.
// Does not publish immediately or expose password/session credentials.
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const dotenv = require("dotenv");
const { createAdminSession } = require("../bots/admin-auth");
const { DEFAULT_SETTINGS } = require("../bots/generation");
const { SOURCE } = require("../bots/story-library");

async function main() {
  const env = dotenv.parse(readFileSync(join(__dirname, "../.env"), "utf8"));
  const origin = `http://127.0.0.1:${Number(env.PORT || 5000)}`;
  const request = async (path = "", body) => {
    const response = await fetch(origin + "/api/admin/bots" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Admin": "1",
        Cookie: `dss_bot_admin=${createAdminSession(env)}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(40000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Story setup did not finish.");
    return result;
  };
  const dashboard = await request();
  if (
    !dashboard.generationConfigured ||
    !dashboard.schedulerConfigured ||
    !dashboard.localScheduler
  )
    throw new Error(
      "The local backend needs its configured generator and scheduler before enabling this collection.",
    );
  if (dashboard.library?.total !== 500)
    throw new Error(
      "Apply the curated library migration and restart the backend first.",
    );
  const bot =
    dashboard.bots.find((b) => b.settings.source === SOURCE) ||
    dashboard.bots[0];
  const settings = {
    ...DEFAULT_SETTINGS,
    ...bot?.settings,
    source: SOURCE,
    name: "Short Stories",
    intervalMinutes: 720,
    postLimit: (bot?.published_count || 0) + dashboard.library.available,
    language: "Tagalog",
    storyTypes: ["horror"],
    allowReplies: true,
  };
  if (!dashboard.library.available)
    throw new Error("All collection stories have already been used.");
  await request("/preview", { settings });
  for (const other of dashboard.bots.filter(
    (b) => b.enabled && b.id !== bot?.id,
  ))
    await request("/save", {
      id: other.id,
      enabled: false,
      settings: { ...DEFAULT_SETTINGS, ...other.settings },
    });
  const saved = await request("/save", {
    id: bot?.id,
    enabled: true,
    settings,
  });
  console.log(
    JSON.stringify({
      enabled: saved.enabled,
      collection: SOURCE,
      available: dashboard.library.available,
      dailyPosts: 2,
      timezone: "Asia/Manila",
      nextRun: saved.next_run_at,
      immediatePublication: false,
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
