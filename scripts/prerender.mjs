import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { canonicalOrigin, sitemapXml, urlInventoryCsv } from "./seo-assets.mjs";
import { robotsForEnvironment } from "../client/src/seo/indexing.js";
import {
  ROUTES_CONFIG,
  DEFAULT_SITE_URL,
  CANONICAL_DEFINITION,
  DISCLOSURE_SENTENCE,
} from "../client/src/seo/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "client", "dist");
const publicDir = path.join(rootDir, "client", "public");
const routeModules = {
  "/browse": "src/views/BrowseView.jsx",
  "/confess": "src/views/SubmitView.jsx",
  "/about": "src/views/AboutView.jsx",
  "/dssc-confessions": "src/views/DsscLandingView.jsx",
  "/faq": "src/views/FaqView.jsx",
  "/privacy": "src/views/PrivacyView.jsx",
  "/guides/how-to-send-an-anonymous-song-confession": "src/views/guides/HowToSendGuide.jsx",
  "/guides/how-to-choose-a-song-for-your-confession": "src/views/guides/HowToChooseSongGuide.jsx",
  "/guides/is-it-safe-to-send-an-anonymous-confession": "src/views/guides/IsItSafeGuide.jsx",
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Reuse the existing build dependencies. No browser, API requests, or student
// content are involved in rendering these public informational views.
const clientRequire = createRequire(path.join(rootDir, "client/package.json"));
const { createServer } = await import(pathToFileURL(clientRequire.resolve("vite")).href);
const React = clientRequire("react");
const { renderToStaticMarkup } = clientRequire("react-dom/server");
const informationalRoutes = new Set([
  "/dssc-confessions", "/about", "/faq", "/privacy",
  ...Object.keys(routeModules).filter(route => route.startsWith("/guides/")),
]);

async function getPrerenderBody(route, config, renderer) {
  const navigation = `<nav aria-label="Main navigation" class="max-w-4xl mx-auto px-6 py-4 flex flex-wrap gap-4 text-nav">
    <a class="btn btn-paper" href="/">Home</a>
    <a class="btn btn-paper" href="/dssc-confessions">DSSC community</a>
    <a class="btn btn-paper" href="/browse">Browse</a>
    <a class="btn btn-paper" href="/confess">Confess</a>
    <a class="btn btn-paper" href="/about">About</a>
    <a class="btn btn-paper" href="/faq">FAQ</a>
  </nav>`;
  const disclosure = `<footer class="max-w-4xl mx-auto px-6 py-8 text-body-sm"><p>${escapeHtml(DISCLOSURE_SENTENCE)}</p></footer>`;
  if (informationalRoutes.has(route)) {
    const { default: View } = await renderer.ssrLoadModule(`/${routeModules[route]}`);
    return `${navigation}<main>${renderToStaticMarkup(React.createElement(View))}</main>${disclosure}`;
  }

  // Interactive feed/search/composer routes deliberately contain no user data.
  return `${navigation}
    <main class="max-w-4xl mx-auto px-6 py-8">
      <h1 class="text-h1 font-script">${escapeHtml(config.h1)}</h1>
      <p class="text-body-lg">${escapeHtml(config.description)}</p>
      <section class="my-8">
        <h2 class="text-h2">Anonymous song dedications for the DSSC community</h2>
        <p class="text-body">${escapeHtml(CANONICAL_DEFINITION)}</p>
        <nav aria-label="Explore DSSC Confessions" class="flex flex-wrap gap-4 my-6">
          <a class="btn btn-paper" href="/dssc-confessions">About the DSSC community project</a>
          <a class="btn btn-paper" href="/confess">Send a song confession</a>
          <a class="btn btn-paper" href="/browse">Browse confessions</a>
          <a class="btn btn-paper" href="/faq">Questions and answers</a>
          <a class="btn btn-paper" href="/privacy">Privacy and deletion</a>
        </nav>
      </section>
    </main>${disclosure}
  `;
}

async function prerender() {
  console.log("⚡ Starting DSSC Confessions Prerender & Static Generation...");

  const baseHtmlPath = path.join(distDir, "index.html");
  let templateHtml;
  try {
    templateHtml = await fs.readFile(baseHtmlPath, "utf8");
  } catch (err) {
    console.error(`❌ Cannot find ${baseHtmlPath}. Run vite build first.`);
    process.exit(1);
  }

  const siteUrl = canonicalOrigin(process.env.VITE_SITE_URL || DEFAULT_SITE_URL);
  const environment = process.env.VERCEL_ENV || "";
  const pages = {};
  const manifest = JSON.parse(await fs.readFile(path.join(distDir, ".vite/manifest.json"), "utf8"));

  const renderer = await createServer({
    root: path.join(rootDir, "client"),
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: "custom",
  });
  try {
    for (const [route, config] of Object.entries(ROUTES_CONFIG)) {
      const canonicalUrl = `${siteUrl}${config.path === "/" ? "/" : config.path}`;
      const jsonLdData = config.getJsonLd ? config.getJsonLd(siteUrl) : null;
      const bodyContent = await getPrerenderBody(route, config, renderer);

      let html = templateHtml;
      // Fetch only this page's chunk in parallel with the entry script, rather
      // than waiting for React to request it. Other screens stay on demand.
      const preloads = new Set();
      const visit = (key) => {
        const chunk = manifest[key];
        if (!chunk || chunk.isEntry || preloads.has(chunk.file)) return;
        preloads.add(chunk.file);
        for (const imported of chunk.imports || []) visit(imported);
      };
      visit(routeModules[route]);
      if (preloads.size) html = html.replace("</head>", [...preloads].map(file =>
        `    <link rel="modulepreload" crossorigin href="/${file}" />\n`).join("") + "  </head>");

      // 1. Language attribute
      html = html.replace(/<html[^>]*>/i, '<html lang="en-PH">');

      // 2. Title & Descriptions
      html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(config.title)}</title>`);
      html = html.replace(
        /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
        `<meta name="description" content="${escapeHtml(config.description)}" />`,
      );

      // Replace template alternates before adding route-specific URLs.
      html = html.replace(/<link\s+rel="alternate"\s+hreflang="[^"]+"[^>]*>/gi, "");
      html = html.replace(/<meta\s+name="robots"\s+content=".*?"\s*\/?>/i,
        `<meta name="robots" content="${escapeHtml(robotsForEnvironment(config.robots, environment))}, max-image-preview:large" />`);

      // 3. Canonical & Hreflang
      html = html.replace(
        /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i,
        `<link rel="canonical" href="${canonicalUrl}" />\n    <link rel="alternate" hreflang="en-PH" href="${canonicalUrl}" />\n    <link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />`,
      );

      // 4. Open Graph & Twitter
      html = html.replace(
        /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
        `<meta property="og:title" content="${escapeHtml(config.title)}" />`,
      );
      html = html.replace(
        /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
        `<meta property="og:description" content="${escapeHtml(config.description)}" />`,
      );
      html = html.replace(
        /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i,
        `<meta property="og:url" content="${canonicalUrl}" />`,
      );
      html = html.replace(
        /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i,
        `<meta name="twitter:title" content="${escapeHtml(config.title)}" />`,
      );
      html = html.replace(
        /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i,
        `<meta name="twitter:description" content="${escapeHtml(config.description)}" />`,
      );

      // 5. Injected JSON-LD
      if (jsonLdData) {
        const jsonLdBlock = `\n    <!-- Prerendered JSON-LD -->\n    <script type="application/ld+json" id="prerendered-jsonld">\n${JSON.stringify(
          jsonLdData,
          null,
          2,
        )}\n    </script>\n`;
        // The template graph belongs to Home. Keep one graph for this route.
        html = html.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "");
        html = html.replace("</head>", `${jsonLdBlock}  </head>`);
      }

      // 6. Inject prerendered body into <div id="root"></div>
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${bodyContent}</div>`,
      );

      const h1 = bodyContent.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, "").trim();
      pages[route] = { h1: h1?.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'") };

      // 7. Write to dist folder
      const targetDir =
        route === "/" ? distDir : path.join(distDir, route.replace(/^\//, ""));
      await fs.mkdir(targetDir, { recursive: true });
      const targetFile = path.join(targetDir, "index.html");
      await fs.writeFile(targetFile, html, "utf8");

      console.log(`  ✓ Prerendered: ${route} -> ${path.relative(rootDir, targetFile)}`);
    }

  } finally {
    await renderer.close();
  }

  // 8. Copy reference assets; generate the sitemap from canonical indexable routes.
  const staticFiles = ["robots.txt", "llms.txt", "llms-full.txt"];
  for (const file of staticFiles) {
    const src = path.join(publicDir, file);
    const dest = path.join(distDir, file);
    try {
      await fs.copyFile(src, dest);
      console.log(`  ✓ Copied static asset: ${file}`);
    } catch {
      console.warn(`  ⚠️ Could not copy ${file} from public to dist`);
    }
  }

  await fs.writeFile(path.join(distDir, "sitemap.xml"), sitemapXml(siteUrl, environment), "utf8");
  const robotsPath = path.join(distDir, "robots.txt");
  const robots = await fs.readFile(robotsPath, "utf8");
  await fs.writeFile(robotsPath, robots.replace(/^Sitemap: .*$/m, `Sitemap: ${siteUrl}/sitemap.xml`), "utf8");
  await fs.writeFile(path.join(distDir, "seo-build.json"), JSON.stringify({ siteUrl, environment }), "utf8");
  await fs.mkdir(path.join(rootDir, "docs/seo"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "docs/seo/url-inventory.csv"), urlInventoryCsv(siteUrl, pages), "utf8");
  console.log("✅ Prerender completed successfully!");
}

prerender().catch((err) => {
  console.error("❌ Prerender failed:", err);
  process.exit(1);
});

