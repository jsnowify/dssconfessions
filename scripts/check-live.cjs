// Read-only smoke check. Never creates test posts in a live database.
const base = process.argv[2] || "https://dssconfessions.vercel.app";
const paths = ["/", "/api/health", "/api/confessions", "/api/search-song?q=hello"];

(async () => {
  for (const path of paths) {
    const url = new URL(path, base);
    const start = performance.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      const type = response.headers.get("content-type") || "";
      const body = type.includes("application/json") ? await response.json() : await response.text();
      const valid = response.ok && (path === "/" ? type.includes("text/html") || body?.status === "online"
        : path === "/api/health" ? body?.status === "ok" && body?.posting === "configured" : Array.isArray(body));
      console.log(JSON.stringify({ path, status: response.status, ms: Math.round(performance.now() - start),
        valid, ...(path === "/api/health" && type.includes("application/json") ? { health: body } : {}) }));
      if (!valid) process.exitCode = 1;
    } catch (error) {
      console.log(JSON.stringify({ path, valid: false, ms: Math.round(performance.now() - start), error: error.message }));
      process.exitCode = 1;
    }
  }
})();
