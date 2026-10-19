import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const source = path.join(root, "client/dist");
const destination = path.join(root, ".vercel/performance/before/site");
await fs.access(path.join(source, "index.html"));
try {
  await fs.access(destination);
  throw new Error("A baseline already exists. Keep it for the before/after comparison.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false });
console.log("Saved the built baseline in .vercel/performance/before/site.");
