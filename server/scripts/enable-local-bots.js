// Owner CLI uses the local session credential and normal protected HTTP APIs.
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const dotenv = require("dotenv");
const { createAdminSession } = require("../bots/admin-auth");
const { DEFAULT_SETTINGS } = require("../bots/generation");

async function main() {
  const file = path.join(__dirname, "../.env");
  let source = fs.readFileSync(file, "utf8");
  let env = dotenv.parse(source);
  if (!env.BOT_ADMIN_PASSWORD_HASH || !env.BOT_ADMIN_SESSION_SECRET)
    throw new Error("Set the local admin password first with npm run admin:password.");
  const settings = { BOT_GENERATOR: "local", BOT_LOCAL_SCHEDULER: "1" };
  if (!env.CRON_SECRET) settings.CRON_SECRET = randomBytes(48).toString("hex");
  if (!env.DELETE_KEY_PEPPER && !env.BOT_DELETE_KEY_PEPPER)
    settings.BOT_DELETE_KEY_PEPPER = randomBytes(48).toString("hex");
  source = source.replace(/^(?:AI_GATEWAY_API_KEY|BOT_AI_MODEL)=.*\r?\n?/gm, "");
  for (const [key, value] of Object.entries(settings)) {
    const pattern = new RegExp(`^${key}=.*$`, "m");
    source = pattern.test(source) ? source.replace(pattern, `${key}=${value}`)
      : source.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(file, source, { mode: 0o600 });
  env = dotenv.parse(source);
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid local API port.");
  const origin = `http://127.0.0.1:${port}`;
  const now = new Date();
  fs.utimesSync(path.join(__dirname, "../index.js"), now, now);
  const request = async (route = "", body) => {
    const response = await fetch(origin + "/api/admin/bots" + route, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", "X-Bot-Admin": "1",
        Cookie: `dss_bot_admin=${createAdminSession(env)}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(40000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Local bot setup did not finish.");
    return data;
  };
  let dashboard;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      dashboard = await request();
      if (dashboard.generator === "local" && dashboard.generationConfigured && dashboard.localScheduler) break;
    } catch { /* The development watcher may be restarting. */ }
    await new Promise(r => setTimeout(r, 500));
  }
  if (!dashboard?.generationConfigured || !dashboard.localScheduler || dashboard.generator !== "local")
    throw new Error("Restart the local backend with npm run dev --prefix server, then rerun this command.");
  if (!dashboard.schedulerConfigured) throw new Error("The local scheduler secret needs repair.");
  const existing = dashboard.bots.find(b => b.settings.name === DEFAULT_SETTINGS.name);
  const botSettings = { ...DEFAULT_SETTINGS, ...existing?.settings,
    language: "English", storyTypes: ["funny", "horror"] };
  if (existing && existing.published_count >= botSettings.postLimit)
    throw new Error("This bot reached its post limit. Increase its limit in the admin controls first.");
  const preview = await request("/preview", { settings: botSettings });
  if (preview.published !== false) throw new Error("Preview verification failed.");
  const bot = await request("/save", { id: existing?.id, enabled: true, settings: botSettings });
  console.log(JSON.stringify({ enabled: bot.enabled, intervalMinutes: bot.settings.intervalMinutes,
    postLimit: bot.settings.postLimit, generator: "built-in", scheduler: "local server", preview: "passed" }));
  const response = await fetch(origin + "/api/cron/confession-bots", {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` }, signal: AbortSignal.timeout(40000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "First scheduled run did not finish.");
  console.log(JSON.stringify({ firstRun: result.state }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
