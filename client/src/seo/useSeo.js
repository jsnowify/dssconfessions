import { useEffect } from "react";
import {
  ROUTES_CONFIG,
  DEFAULT_SITE_URL,
  SITE_NAME,
  DEFAULT_LANG,
  DEFAULT_LOCALE,
  GEO_REGION,
} from "./routes";

function setMetaTag(selector, attribute, value) {
  if (typeof document === "undefined") return;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    const match = selector.match(/meta\[([^=]+)="?([^"\]]+)"?\]/);
    if (match) {
      tag.setAttribute(match[1], match[2]);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute(attribute, value);
}

function setCanonical(href) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function setHreflang(hreflang, href) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "alternate");
    link.setAttribute("hreflang", hreflang);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function setJsonLd(data) {
  if (typeof document === "undefined") return;
  let script = document.head.querySelector('script[id="dynamic-jsonld"]');
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("id", "dynamic-jsonld");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function useSeo({ view, query = "", confessionId = null }) {
  useEffect(() => {
    const siteUrl = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL;

    // Set document language
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = DEFAULT_LANG;
    }

    // Optional search console verification tags
    const googleVerification = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION;
    const bingVerification = import.meta.env.VITE_BING_SITE_VERIFICATION;
    if (googleVerification) {
      setMetaTag('meta[name="google-site-verification"]', "content", googleVerification);
    }
    if (bingVerification) {
      setMetaTag('meta[name="msvalidate.01"]', "content", bingVerification);
    }

    // Set geographic metadata
    setMetaTag('meta[name="geo.region"]', "content", GEO_REGION);
    setMetaTag('meta[property="og:locale"]', "content", DEFAULT_LOCALE);

    // 1. Confession deep link: strictly private, noindex
    if (view === "details" || confessionId) {
      document.title = `Confession | ${SITE_NAME}`;
      setMetaTag('meta[name="description"]', "content", "A community story and song on DSSC Confessions.");
      setMetaTag('meta[name="robots"]', "content", "noindex, nofollow");
      setCanonical(`${siteUrl}/confession/${confessionId || ""}`);
      setMetaTag('meta[property="og:title"]', "content", `Confession | ${SITE_NAME}`);
      setMetaTag('meta[property="og:description"]', "content", "Listen to an untold story paired with a song.");
      setMetaTag('meta[property="og:url"]', "content", `${siteUrl}/confession/${confessionId || ""}`);
      setMetaTag('meta[property="og:type"]', "content", "website");
      setMetaTag('meta[name="twitter:card"]', "content", "summary");
      setMetaTag('meta[name="twitter:title"]', "content", `Confession | ${SITE_NAME}`);
      setMetaTag('meta[name="twitter:description"]', "content", "Listen to an untold story paired with a song.");

      // Remove structured data for user content
      const oldScript = document.head.querySelector('script[id="dynamic-jsonld"]');
      if (oldScript) oldScript.remove();
      return;
    }

    // 2. Browse with search query: noindex, follow (canonical to /browse)
    if (view === "browse" && query.trim()) {
      document.title = `Search "${query}" | Browse ${SITE_NAME}`;
      setMetaTag('meta[name="description"]', "content", `Search results for recipient "${query}" on ${SITE_NAME}.`);
      setMetaTag('meta[name="robots"]', "content", "noindex, follow");
      setCanonical(`${siteUrl}/browse`);
      setMetaTag('meta[property="og:title"]', "content", `Search "${query}" | ${SITE_NAME}`);
      setMetaTag('meta[property="og:description"]', "content", `Confession search results for "${query}".`);
      setMetaTag('meta[property="og:url"]', "content", `${siteUrl}/browse`);
      return;
    }

    // 3. Known static routes
    const routePath =
      view === "home"
        ? "/"
        : view === "dssc-landing"
          ? "/dssc-confessions"
          : view === "browse"
            ? "/browse"
            : view === "submit"
              ? "/confess"
              : view === "about"
                ? "/about"
                : view === "faq"
                  ? "/faq"
                  : view === "privacy"
                    ? "/privacy"
                    : view === "guide-how-to-send"
                      ? "/guides/how-to-send-an-anonymous-song-confession"
                      : view === "guide-choose-song"
                        ? "/guides/how-to-choose-a-song-for-your-confession"
                        : view === "guide-is-it-safe"
                          ? "/guides/is-it-safe-to-send-an-anonymous-confession"
                          : window.location.pathname;

    const config = ROUTES_CONFIG[routePath] || ROUTES_CONFIG["/"];
    const canonicalUrl = `${siteUrl}${config.path === "/" ? "/" : config.path}`;

    document.title = config.title;
    setMetaTag('meta[name="description"]', "content", config.description);
    setMetaTag('meta[name="robots"]', "content", config.robots);
    setCanonical(canonicalUrl);
    setHreflang("en-PH", canonicalUrl);
    setHreflang("x-default", canonicalUrl);

    // Open Graph
    setMetaTag('meta[property="og:title"]', "content", config.title);
    setMetaTag('meta[property="og:description"]', "content", config.description);
    setMetaTag('meta[property="og:url"]', "content", canonicalUrl);
    setMetaTag('meta[property="og:type"]', "content", config.ogType || "website");
    setMetaTag('meta[property="og:site_name"]', "content", SITE_NAME);
    setMetaTag('meta[property="og:image"]', "content", `${siteUrl}/og-default.png`);
    setMetaTag('meta[property="og:image:width"]', "content", "1200");
    setMetaTag('meta[property="og:image:height"]', "content", "630");

    // Twitter Card
    setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "content", config.title);
    setMetaTag('meta[name="twitter:description"]', "content", config.description);
    setMetaTag('meta[name="twitter:image"]', "content", `${siteUrl}/og-default.png`);

    // Dynamic JSON-LD structured data
    if (typeof config.getJsonLd === "function") {
      setJsonLd(config.getJsonLd(siteUrl));
    }
  }, [view, query, confessionId]);
}
