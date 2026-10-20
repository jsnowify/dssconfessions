import { env } from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { manifest: true },
  define: {
    "import.meta.env.VITE_DEPLOYMENT_ENV": JSON.stringify(env.VERCEL_ENV || ""),
  },
  server: { proxy: { "/api": "http://localhost:5000" } },
});
