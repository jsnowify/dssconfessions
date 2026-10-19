/**
 * Parses current window pathname and search query into a structured route.
 */
export function parseCurrentLocation() {
  const pathname =
    window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const searchParams = new URLSearchParams(window.location.search);
  if (
    pathname === "/admin" ||
    pathname === "/admin/bots" ||
    pathname === "/admin/reports" ||
    pathname === "/admin/moderation"
  ) {
    return {
      view: "bot-admin",
      query: "",
      confessionId: null,
      adminTab: pathname === "/admin/bots" ? "bots" : "moderation",
    };
  }

  // 1. Confession deep link: /confession/:id or ?confession=:id or ?id=:id
  const confessionMatch = pathname.match(/^\/confession(?:s)?\/([a-f0-9-]+)$/i);
  const confessionId =
    confessionMatch?.[1] ||
    searchParams.get("confession") ||
    searchParams.get("id");
  if (confessionId) {
    return { view: "details", confessionId, query: "" };
  }

  // 2. Browse: /browse or ?to= or ?search=
  if (
    pathname === "/browse" ||
    searchParams.has("to") ||
    searchParams.has("search")
  ) {
    const query = searchParams.get("to") || searchParams.get("search") || "";
    return { view: "browse", query, confessionId: null };
  }

  // 3. Submit: /confess or /submit
  if (pathname === "/confess" || pathname === "/submit") {
    return { view: "submit", query: "", confessionId: null };
  }

  // 4. About: /about
  if (pathname === "/about") {
    return { view: "about", query: "", confessionId: null };
  }

  // 4b. DSSC Community Landing Page: /dssc-confessions
  if (pathname === "/dssc-confessions") {
    return { view: "dssc-landing", query: "", confessionId: null };
  }

  // 5. FAQ: /faq
  if (pathname === "/faq") {
    return { view: "faq", query: "", confessionId: null };
  }

  // 6. Privacy: /privacy
  if (pathname === "/privacy") {
    return { view: "privacy", query: "", confessionId: null };
  }

  // 7. Guides
  if (
    pathname === "/guides/how-to-send-an-anonymous-song-confession" ||
    pathname === "/guides/how-to-send-an-anonymous-confession"
  ) {
    return { view: "guide-how-to-send", query: "", confessionId: null };
  }
  if (pathname === "/guides/how-to-choose-a-song-for-your-confession") {
    return { view: "guide-choose-song", query: "", confessionId: null };
  }
  if (pathname === "/guides/is-it-safe-to-send-an-anonymous-confession") {
    return { view: "guide-is-it-safe", query: "", confessionId: null };
  }

  // Default: Home
  return { view: "home", query: "", confessionId: null };
}

