/**
 * Central SEO, GEO, and AEO Source of Truth for DSSConfessions.
 * Reused by client-side head manager, build-time prerenderer, sitemap generator,
 * JSON-LD schema builder, and llms.txt.
 */

export const CANONICAL_DEFINITION =
  "dssconfessions is a free, privacy-first website where anyone can share an anonymous confession paired with a Spotify song, without creating an account or logging personal data.";

export const DEFAULT_SITE_URL = "https://dssconfessions.vercel.app";

export const CREATOR_INFO = {
  name: "Joshua",
  role: "Creator & Developer of DSSConfessions",
  sameAs: [], // TODO(owner): Add public GitHub/LinkedIn profile URL if desired
};

export const ROUTES_CONFIG = {
  "/": {
    path: "/",
    title: "DSSConfessions | Anonymous Song Confessions & Stories",
    description:
      "Send an anonymous confession paired with your favorite Spotify soundtrack. Discover untold stories whispered by the community without creating an account.",
    robots: "index, follow",
    ogType: "website",
    h1: "Leave a confession. Attach a soundtrack.",
    breadcrumbs: [{ name: "Home", item: "/" }],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "DSSConfessions",
        url: siteUrl,
        description: CANONICAL_DEFINITION,
        inLanguage: "en",
        publisher: {
          "@type": "Organization",
          name: "DSSConfessions",
          url: siteUrl,
          logo: {
            "@type": "ImageObject",
            url: `${siteUrl}/logo-mark.svg`,
          },
          image: `${siteUrl}/og-default.png`,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/browse?to={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "DSSConfessions",
        url: siteUrl,
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires modern web browser with JavaScript enabled",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "DSSConfessions | Anonymous Song Confessions & Stories",
        url: `${siteUrl}/`,
        description: CANONICAL_DEFINITION,
      },
    ],
  },
  "/browse": {
    path: "/browse",
    title: "Browse Confessions | Search Stories by Recipient Name",
    description:
      "Search anonymous confessions and Spotify song dedications by recipient name. Discover if someone left an untold story or song dedicated to you.",
    robots: "index, follow",
    ogType: "website",
    h1: "Search Confessions",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "Browse", item: "/browse" },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Browse Confessions | Search Stories by Recipient Name",
        url: `${siteUrl}/browse`,
        description:
          "Search anonymous confessions and Spotify song dedications by recipient name.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Browse",
            item: `${siteUrl}/browse`,
          },
        ],
      },
    ],
  },
  "/confess": {
    path: "/confess",
    title: "Send a Song Confession | Share an Anonymous Story",
    description:
      "Write an anonymous message and pair it with a Spotify song. Pour out what you never said and let it find its way to them with no sign-up required.",
    robots: "index, follow",
    ogType: "website",
    h1: "Confess Your Story",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "Confess", item: "/confess" },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Send a Song Confession | Share an Anonymous Story",
        url: `${siteUrl}/confess`,
        description:
          "Write an anonymous message and pair it with a Spotify song with no sign-up required.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Confess",
            item: `${siteUrl}/confess`,
          },
        ],
      },
    ],
  },
  "/about": {
    path: "/about",
    title: "About DSSConfessions | The Anonymous Mixtape Project",
    description:
      "Learn about DSSConfessions, our privacy guarantees, and how we pair community stories with music while storing zero IP addresses or personal identities.",
    robots: "index, follow",
    ogType: "website",
    h1: "About DSSConfessions",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "About", item: "/about" },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About DSSConfessions | The Anonymous Mixtape Project",
        url: `${siteUrl}/about`,
        description:
          "Learn about DSSConfessions, our privacy guarantees, and how we pair community stories with music.",
        mainEntity: {
          "@type": "Person",
          name: CREATOR_INFO.name,
          jobTitle: CREATOR_INFO.role,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "About",
            item: `${siteUrl}/about`,
          },
        ],
      },
    ],
  },
  "/faq": {
    path: "/faq",
    title: "Frequently Asked Questions | Anonymity, Songs & Safety",
    description:
      "Got questions about DSSConfessions? Read answers about our anonymity model, how songs work via Spotify, deletion keys, reporting, and zero-IP privacy.",
    robots: "index, follow",
    ogType: "website",
    h1: "Frequently Asked Questions",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "FAQ", item: "/faq" },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        name: "Frequently Asked Questions | DSSConfessions",
        url: `${siteUrl}/faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is dssconfessions?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "dssconfessions is a free, privacy-first website where anyone can share an anonymous confession paired with a Spotify song, without creating an account or logging personal data.",
            },
          },
          {
            "@type": "Question",
            name: "Is dssconfessions really anonymous?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. We do not require accounts, logins, email addresses, or phone numbers. We never store raw IP addresses or device fingerprints. Rate limiting uses transient cryptographic hashes that rotate daily.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need an account to post or search?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No account is ever needed. Anyone can write a confession, search by recipient name, and listen to attached songs freely without signing up.",
            },
          },
          {
            "@type": "Question",
            name: "How do I delete a confession I posted?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "When you submit a confession, you receive a private one-time Delete Key. Save this key. You can enter it on your confession card at any time to permanently remove the confession from our database.",
            },
          },
          {
            "@type": "Question",
            name: "How do I report a confession about me?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Click the flag icon on any confession card and select 'This is about me and I want it removed' or choose another reason. Reports reaching the review threshold are automatically hidden from public view.",
            },
          },
          {
            "@type": "Question",
            name: "What are Pokes on confessions?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A Poke is a friendly, lightweight 'I saw this' nudge on a confession. Pokes are anonymous, cannot be traced to any user, and let authors know someone noticed their story.",
            },
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "FAQ",
            item: `${siteUrl}/faq`,
          },
        ],
      },
    ],
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy Policy & Zero-IP Guarantee | DSSConfessions",
    description:
      "Read our strict privacy policy: no user accounts, no raw IP logging, daily rotating HMAC salts for rate limits, one-time deletion keys, and content removal.",
    robots: "index, follow",
    ogType: "website",
    h1: "Privacy Policy & Guarantees",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "Privacy", item: "/privacy" },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Privacy Policy & Zero-IP Guarantee | DSSConfessions",
        url: `${siteUrl}/privacy`,
        description:
          "Read our strict privacy policy: no user accounts, no raw IP logging, and daily rotating hashes.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Privacy",
            item: `${siteUrl}/privacy`,
          },
        ],
      },
    ],
  },
  "/guides/how-to-send-an-anonymous-song-confession": {
    path: "/guides/how-to-send-an-anonymous-song-confession",
    title: "How to Send an Anonymous Song Confession | Guide",
    description:
      "A complete step-by-step walkthrough on writing an anonymous confession, picking the right Spotify track, saving your Delete Key, and sharing safely.",
    robots: "index, follow",
    ogType: "article",
    h1: "How to Send an Anonymous Song Confession",
    datePublished: "2026-10-18T00:00:00Z",
    dateModified: "2026-10-18T00:00:00Z",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "Guides", item: "/guides" },
      {
        name: "How to Send a Confession",
        item: "/guides/how-to-send-an-anonymous-song-confession",
      },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "How to Send an Anonymous Song Confession",
        url: `${siteUrl}/guides/how-to-send-an-anonymous-song-confession`,
        datePublished: "2026-10-18T00:00:00Z",
        dateModified: "2026-10-18T00:00:00Z",
        author: {
          "@type": "Person",
          name: CREATOR_INFO.name,
        },
        publisher: {
          "@type": "Organization",
          name: "DSSConfessions",
          url: siteUrl,
        },
        description:
          "A complete step-by-step walkthrough on writing an anonymous confession, picking the right Spotify track, and sharing safely.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "How to Send a Confession",
            item: `${siteUrl}/guides/how-to-send-an-anonymous-song-confession`,
          },
        ],
      },
    ],
  },
  "/guides/how-to-choose-a-song-for-your-confession": {
    path: "/guides/how-to-choose-a-song-for-your-confession",
    title: "How to Choose a Song for Your Confession | Song Ideas",
    description:
      "Find the right soundtrack for your unspoken words. Curated song recommendations organized by feeling: missing someone, kilig, apologies, and thank-yous.",
    robots: "index, follow",
    ogType: "article",
    h1: "How to Choose a Song for Your Confession",
    datePublished: "2026-10-18T00:00:00Z",
    dateModified: "2026-10-18T00:00:00Z",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "Guides", item: "/guides" },
      {
        name: "Choose a Song",
        item: "/guides/how-to-choose-a-song-for-your-confession",
      },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "How to Choose a Song for Your Confession",
        url: `${siteUrl}/guides/how-to-choose-a-song-for-your-confession`,
        datePublished: "2026-10-18T00:00:00Z",
        dateModified: "2026-10-18T00:00:00Z",
        author: {
          "@type": "Person",
          name: CREATOR_INFO.name,
        },
        publisher: {
          "@type": "Organization",
          name: "DSSConfessions",
          url: siteUrl,
        },
        description:
          "Find the right soundtrack for your unspoken words with curated song ideas organized by emotion.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Choose a Song",
            item: `${siteUrl}/guides/how-to-choose-a-song-for-your-confession`,
          },
        ],
      },
    ],
  },
  "/guides/is-it-safe-to-send-an-anonymous-confession": {
    path: "/guides/is-it-safe-to-send-an-anonymous-confession",
    title: "Is It Safe to Send an Anonymous Confession? | Safety Facts",
    description:
      "Understand what makes an anonymous confession truly safe. Facts on data retention, zero-IP logging, what details not to share, and takedown procedures.",
    robots: "index, follow",
    ogType: "article",
    h1: "Is It Safe to Send an Anonymous Confession?",
    datePublished: "2026-10-18T00:00:00Z",
    dateModified: "2026-10-18T00:00:00Z",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "Guides", item: "/guides" },
      {
        name: "Safety Guide",
        item: "/guides/is-it-safe-to-send-an-anonymous-confession",
      },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Is It Safe to Send an Anonymous Confession?",
        url: `${siteUrl}/guides/is-it-safe-to-send-an-anonymous-confession`,
        datePublished: "2026-10-18T00:00:00Z",
        dateModified: "2026-10-18T00:00:00Z",
        author: {
          "@type": "Person",
          name: CREATOR_INFO.name,
        },
        publisher: {
          "@type": "Organization",
          name: "DSSConfessions",
          url: siteUrl,
        },
        description:
          "Understand what makes an anonymous confession truly safe with real privacy and technical facts.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Safety Guide",
            item: `${siteUrl}/guides/is-it-safe-to-send-an-anonymous-confession`,
          },
        ],
      },
    ],
  },
};

export const INDEXABLE_ROUTES = Object.keys(ROUTES_CONFIG);
