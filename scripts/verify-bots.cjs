// Uses fixture-only SQL, AI, Spotify and browser traffic. Never publishes live posts.
const { spawn } = require("node:child_process");
const { join } = require("node:path");
const child = spawn(process.execPath, ["--test", "server/test/bots.test.js"], {
  cwd: join(__dirname, ".."),
  env: { ...process.env, BOT_BROWSER_VERIFY: "1" },
  stdio: "inherit",
});
child.on("error", () => {
  console.error("Could not start bot verification.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
