const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { hashAdminPassword } = require("../bots/admin-auth");

// Local setup only. Read from a hidden terminal prompt or stdin, never arguments.
async function readPassword() {
  process.stdin.setEncoding("utf8");
  if (!process.stdin.isTTY) {
    let value = "";
    for await (const chunk of process.stdin) {
      value += chunk;
      if (value.length > 258) throw new Error("Password is too long.");
    }
    return value.replace(/\r?\n$/, "");
  }
  process.stdout.write("New admin password: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      process.stdin.off("data", receive);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const receive = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") return finish(new Error("Cancelled."));
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u007f" || char === "\b")
          value = [...value].slice(0, -1).join("");
        else if (char >= " ") value += char;
        if (value.length > 256)
          return finish(new Error("Password is too long."));
      }
    };
    process.stdin.on("data", receive);
  });
}

async function main() {
  const password = await readPassword();
  const hash = await hashAdminPassword(password);
  const file = path.join(__dirname, "../.env");
  let source = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  source = source
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:export\s+)?BOT_ADMIN_TOKEN\s*=/.test(line))
    .join(newline);
  const settings = {
    BOT_ADMIN_PASSWORD_HASH: hash,
    BOT_ADMIN_SESSION_SECRET: randomBytes(48).toString("hex"),
  };
  for (const [key, value] of Object.entries(settings)) {
    const pattern = new RegExp(`^${key}=.*$`, "m");
    if (pattern.test(source))
      source = source.replace(pattern, `${key}=${value}`);
    else
      source +=
        (source.endsWith("\n") ? "" : newline) + `${key}=${value}${newline}`;
  }
  fs.writeFileSync(file, source, { mode: 0o600 });
  // The development watcher reloads imported code, but does not watch .env.
  const now = new Date();
  fs.utimesSync(path.join(__dirname, "../index.js"), now, now);
  console.log(
    "Local admin password saved. Restart the backend if it is not running in watch mode.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
