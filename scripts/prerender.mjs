import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROUTES_CONFIG,
  DEFAULT_SITE_URL,
  SITE_NAME,
  CANONICAL_DEFINITION,
  DISCLOSURE_SENTENCE,
  DISAMBIGUATION_NOTE,
  OFFICIAL_COLLEGE_NAME,
  OFFICIAL_COLLEGE_URL,
} from "../client/src/seo/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "client", "dist");
const publicDir = path.join(rootDir, "client", "public");

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPrerenderBody(route, config) {
  if (route === "/dssc-confessions") {
    return `
      <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:sans-serif;line-height:1.6;color:#1F2A44;">
        <nav aria-label="Breadcrumb" style="font-family:monospace;font-size:12px;margin-bottom:20px;">
          <a href="/">Home</a> / <span>DSSC Confessions</span>
        </nav>
        <h1 style="font-size:2.2rem;margin-bottom:16px;">${escapeHtml(config.h1)}</h1>
        <div style="background:#FFFFFF;border:2px solid #1F2A44;padding:24px;border-radius:16px;box-shadow:4px 4px 0 #1F2A44;margin-bottom:24px;">
          <h2 style="font-size:1.3rem;margin-top:0;">What is DSSC Confessions?</h2>
          <p style="font-size:1.05rem;">${escapeHtml(CANONICAL_DEFINITION)}</p>
        </div>
        <div style="background:#FEF08A;border:2px solid #1F2A44;padding:20px;border-radius:16px;box-shadow:3px 3px 0 #1F2A44;margin-bottom:30px;">
          <p style="font-weight:bold;margin:0 0 10px 0;">⚠️ ${escapeHtml(DISCLOSURE_SENTENCE)}</p>
          <p style="font-size:0.9rem;margin:0;">
            ${escapeHtml(DISAMBIGUATION_NOTE)}
            Visit the official <a href="${OFFICIAL_COLLEGE_URL}" target="_blank" rel="noopener noreferrer" style="color:#2563EB;font-weight:bold;">${escapeHtml(OFFICIAL_COLLEGE_NAME)} website (${OFFICIAL_COLLEGE_URL})</a> for enrollment, student portal login, and official announcements.
          </p>
        </div>
        <section style="margin-bottom:30px;">
          <h2 style="font-size:1.4rem;">How to Send a Confession with a Song</h2>
          <ol style="padding-left:20px;">
            <li>Navigate to the <a href="/confess" style="color:#2563EB;">Confess page</a>.</li>
            <li>Enter the recipient's name or pseudonym.</li>
            <li>Search Spotify for the exact track that carries your unspoken words.</li>
            <li>Compose your message (up to 3,000 characters).</li>
            <li>Post your confession and safely store your private 16-character Delete Key.</li>
          </ol>
        </section>
        <section style="margin-bottom:30px;">
          <h2 style="font-size:1.4rem;">Community Safety & Moderation Rules</h2>
          <p>DSSC Confessions is committed to a safe, positive environment for all students in Davao del Sur. Harassment, bullying, doxxing, naming minors, and hate speech are strictly prohibited.</p>
          <p>Any visitor can report a confession using the in-app flag icon. Urgent reports are hidden automatically from the public feed.</p>
        </section>
        <footer style="margin-top:50px;padding-top:20px;border-top:1px solid #1F2A44;font-family:monospace;font-size:12px;text-align:center;">
          <p>Independent student project, not affiliated with or endorsed by Davao del Sur State College.</p>
        </footer>
      </main>
    `;
  }

  // Generic fallback body for other routes
  return `
    <main style="max-width:900px;margin:0 auto;padding:40px 20px;font-family:sans-serif;line-height:1.6;color:#1F2A44;">
      <h1 style="font-size:2rem;margin-bottom:16px;">${escapeHtml(config.h1)}</h1>
      <p style="font-size:1.05rem;color:#4A5568;">${escapeHtml(config.description)}</p>
      <footer style="margin-top:50px;padding-top:20px;border-top:1px solid #1F2A44;font-family:monospace;font-size:12px;text-align:center;">
        <p>Independent student project, not affiliated with or endorsed by Davao del Sur State College.</p>
      </footer>
    </main>
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

  const siteUrl = process.env.VITE_SITE_URL || DEFAULT_SITE_URL;

  for (const [route, config] of Object.entries(ROUTES_CONFIG)) {
    const canonicalUrl = `${siteUrl}${config.path === "/" ? "/" : config.path}`;
    const jsonLdData = config.getJsonLd ? config.getJsonLd(siteUrl) : null;
    const bodyContent = getPrerenderBody(route, config);

    let html = templateHtml;

    // 1. Language attribute
    html = html.replace(/<html[^>]*>/i, '<html lang="en-PH">');

    // 2. Title & Descriptions
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(config.title)}</title>`);
    html = html.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(config.description)}" />`,
    );

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
      // Replace existing dynamic script if present, or append before </head>
      if (html.includes('id="dynamic-jsonld"')) {
        html = html.replace(/<script[^>]*id="dynamic-jsonld"[^>]*>[\s\S]*?<\/script>/i, jsonLdBlock);
      } else {
        html = html.replace("</head>", `${jsonLdBlock}  </head>`);
      }
    }

    // 6. Inject prerendered body into <div id="root"></div>
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${bodyContent}</div>`,
    );

    // 7. Write to dist folder
    const targetDir =
      route === "/" ? distDir : path.join(distDir, route.replace(/^\//, ""));
    await fs.mkdir(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, "index.html");
    await fs.writeFile(targetFile, html, "utf8");

    console.log(`  ✓ Prerendered: ${route} -> ${path.relative(rootDir, targetFile)}`);
  }

  // 8. Ensure sitemap.xml, robots.txt, llms.txt, llms-full.txt are in dist
  const staticFiles = ["sitemap.xml", "robots.txt", "llms.txt", "llms-full.txt"];
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

  console.log("✅ Prerender completed successfully!");
}

prerender().catch((err) => {
  console.error("❌ Prerender failed:", err);
  process.exit(1);
});

