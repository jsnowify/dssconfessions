import { ROUTES_CONFIG, DEFAULT_SITE_URL } from "../client/src/seo/routes.js";
import { robotsForEnvironment } from "../client/src/seo/indexing.js";

export function canonicalOrigin(value = DEFAULT_SITE_URL) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error("VITE_SITE_URL must be an HTTP(S) origin without a path, credentials, query, or fragment");
  }
  return url.origin;
}

export function sitemapXml(siteUrl = DEFAULT_SITE_URL, environment = "") {
  const origin = canonicalOrigin(siteUrl);
  const urls = Object.values(ROUTES_CONFIG)
    .filter(config => robotsForEnvironment(config.robots, environment).split(/[,\s]+/).includes('index'))
    .map(config => `  <url><loc>${origin}${config.path}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function urlInventoryCsv(siteUrl = DEFAULT_SITE_URL, pages = {}) {
  const origin = canonicalOrigin(siteUrl);
  const rows = [["Current URL", "New URL", "Expected HTTP status", "Title", "H1", "Canonical", "Indexability", "Redirect required"]];
  for (const config of Object.values(ROUTES_CONFIG)) {
    const url = `${origin}${config.path}`;
    rows.push([url, url, "200", config.title, pages[config.path]?.h1 || config.h1, url, config.robots, "No; URL preserved"]);
  }
  return rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
}
