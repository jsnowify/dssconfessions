import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";

for (const phase of ["before", "after"]) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(import.meta.dirname, "audit.mjs"), phase], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${phase} audit failed (${code})`)));
  });
  const resultPath = path.resolve(import.meta.dirname, "../../performance-results", phase + ".json");
  const result = JSON.parse(await fs.readFile(resultPath, "utf8"));
  // HTTP measurements run against a fresh fixture before browser navigation.
  await fs.writeFile(resultPath.replace(/\.json$/, "-stress.json"), JSON.stringify({
    phase, date: result.date, conditions: result.conditions,
    stress: result.stress, rateLimit: result.rateLimit, writes: result.writes,
  }, null, 2) + "\n");
}
await import("./report.mjs");
