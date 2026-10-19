/**
 * Central SEO, GEO, and AEO Source of Truth for DSSConfessions.
 * Reused across client-side head manager, build-time prerenderer, sitemap generator,
 * JSON-LD schema builder, and llms.txt.
 */

export const SITE_NAME = "DSSC Confessions";
export const SITE_ALTERNATE_NAMES = ["dssconfessions", "DSSC Confession Page"];

export const CANONICAL_DEFINITION =
  "DSSC Confessions (dssconfessions) is a free, independent website where people in the Davao del Sur State College community can send an anonymous message to someone, paired with a song, without creating an account. It is not affiliated with or endorsed by Davao del Sur State College.";

export const DISCLOSURE_SENTENCE =
  "Independent student project. Not affiliated with or endorsed by Davao del Sur State College.";

export const DISAMBIGUATION_NOTE =
  "Looking for the official college website or student portal?";

export const OFFICIAL_COLLEGE_NAME = "Davao del Sur State College";
export const OFFICIAL_COLLEGE_URL = "https://www.dssc.edu.ph/";
export const OFFICIAL_PORTAL_URL = "https://portal.dssc.edu.ph/";
export const OFFICIAL_WIKIPEDIA_URL =
  "https://en.wikipedia.org/wiki/Davao_del_Sur_State_College";

export const DEFAULT_SITE_URL = "https://dssconfessions.vercel.app";
export const DEFAULT_LANG = "en-PH";
export const DEFAULT_LOCALE = "en_PH";
export const GEO_REGION = "PH-DAS"; // ISO 3166-2 for Davao del Sur

export const CREATOR_INFO = {
  name: "Joshua",
  role: "Creator & Developer of DSSConfessions",
  sameAs: [], // TODO(owner): Add public GitHub/LinkedIn profile URL if desired
};

export const ROUTES_CONFIG = {
  "/": {
    path: "/",
    title: "DSSC Confessions | Anonymous Song Confessions & Stories",
    description:
      "Send an anonymous confession paired with a song to someone in the Davao del Sur State College community. Free, no accounts, and 100% private.",
    robots: "index, follow",
    ogType: "website",
    h1: "Leave a confession. Attach a soundtrack.",
    breadcrumbs: [{ name: "Home", item: "/" }],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: siteUrl,
        description: CANONICAL_DEFINITION,
        inLanguage: DEFAULT_LANG,
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
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
        name: SITE_NAME,
        url: siteUrl,
        description: CANONICAL_DEFINITION,
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "Any",
        inLanguage: DEFAULT_LANG,
        audience: {
          "@type": "Audience",
          audienceType: "Students and community of Davao del Sur State College",
        },
        browserRequirements: "Requires modern web browser with JavaScript enabled",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "PHP",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "DSSC Confessions | Anonymous Song Confessions & Stories",
        url: `${siteUrl}/`,
        description: CANONICAL_DEFINITION,
        inLanguage: DEFAULT_LANG,
        disambiguatingDescription: DISCLOSURE_SENTENCE,
      },
    ],
  },
  "/dssc-confessions": {
    path: "/dssc-confessions",
    title: "DSSC Confessions | Anonymous Song Confessions, Davao del Sur",
    description:
      "Send an anonymous confession paired with a song to someone in the Davao del Sur State College community. Free, no accounts. Independent student project.",
    robots: "index, follow",
    ogType: "website",
    h1: "DSSC Confessions: Send an Anonymous Song to Someone at Davao del Sur State College",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "DSSC Confessions", item: "/dssc-confessions" },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "DSSC Confessions | Anonymous Song Confessions, Davao del Sur",
        url: `${siteUrl}/dssc-confessions`,
        description: CANONICAL_DEFINITION,
        disambiguatingDescription:
          "Independent student-made website; not the official Davao del Sur State College site or portal.",
        inLanguage: DEFAULT_LANG,
        isPartOf: {
          "@type": "WebSite",
          name: SITE_NAME,
          url: siteUrl,
        },
        about: {
          "@type": "Thing",
          name: OFFICIAL_COLLEGE_NAME,
          url: OFFICIAL_COLLEGE_URL,
          sameAs: OFFICIAL_WIKIPEDIA_URL,
        },
        spatialCoverage: {
          "@type": "AdministrativeArea",
          name: "Davao del Sur, Philippines",
          sameAs: "https://en.wikipedia.org/wiki/Davao_del_Sur",
        },
        audience: {
          "@type": "Audience",
          audienceType: "Students and community of Davao del Sur State College",
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
            name: "DSSC Confessions",
            item: `${siteUrl}/dssc-confessions`,
          },
        ],
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
        inLanguage: DEFAULT_LANG,
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
        inLanguage: DEFAULT_LANG,
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
    title: "About DSSC Confessions | The Anonymous Mixtape Project",
    description:
      "Learn about DSSC Confessions, our community context in Davao del Sur, privacy guarantees, and how we pair stories with music with zero IP logging.",
    robots: "index, follow",
    ogType: "website",
    h1: "About DSSC Confessions",
    breadcrumbs: [
      { name: "Home", item: "/" },
      { name: "About", item: "/about" },
    ],
    getJsonLd: (siteUrl) => [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About DSSC Confessions | The Anonymous Mixtape Project",
        url: `${siteUrl}/about`,
        description:
          "Learn about DSSC Confessions, our privacy guarantees, and how we pair community stories with music in Davao del Sur.",
        inLanguage: DEFAULT_LANG,
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
    title: "Frequently Asked Questions | DSSC Confessions FAQ",
    description:
      "Find answers about DSSC Confessions: official status, affiliation, anonymity model, Spotify music, deletion keys, reporting, and zero-IP privacy.",
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
        name: "Frequently Asked Questions | DSSC Confessions",
        url: `${siteUrl}/faq`,
        inLanguage: DEFAULT_LANG,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is DSSC Confessions?",
            acceptedAnswer: {
              "@type": "Answer",
              text: CANONICAL_DEFINITION,
            },
          },
          {
            "@type": "Question",
            name: "Is DSSC Confessions the official DSSC website or student portal?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. DSSC Confessions is an independent, student-made creative website. It is not the official website, student portal, or grading system of Davao del Sur State College. For official enrollment and records, visit the official college site.",
            },
          },
          {
            "@type": "Question",
            name: "Is DSSC Confessions affiliated with Davao del Sur State College?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. DSSC Confessions is not affiliated with, sponsored by, or endorsed by Davao del Sur State College. The college name is used purely descriptively to identify the student and campus community we serve.",
            },
          },
          {
            "@type": "Question",
            name: "Where can I find the official DSSC website or student portal?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The official website of Davao del Sur State College is at https://www.dssc.edu.ph/. For student and employee portal services (enrollment, grades, records), access the official DSSC Portal directly at https://portal.dssc.edu.ph/.",
            },
          },
          {
            "@type": "Question",
            name: "Who can send a confession?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Anyone in the Davao del Sur State College community—students, alumni, faculty, and friends across Digos City and Davao del Sur—can send an anonymous confession. No account, student ID, or login is required.",
            },
          },
          {
            "@type": "Question",
            name: "Is DSSC Confessions safe and anonymous?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. We require no accounts, email addresses, or phone numbers. We never log raw IP addresses or device fingerprints. Abuse-prevention safeguards operate without storing or logging your personal identity.",
            },
          },
          {
            "@type": "Question",
            name: "How do I report or remove a confession about me?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Click the flag icon on any confession card and choose 'This is about me and I want it removed' or another reason. Confessions receiving verified urgent reports are hidden automatically from public view.",
            },
          },
          {
            "@type": "Question",
            name: "How do I delete a confession I posted?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "When you submit a confession, you receive a private one-time Delete Key. Enter this key on your confession card at any time to permanently remove it from our database.",
            },
          },
          {
            "@type": "Question",
            name: "Who runs DSSC Confessions?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "DSSC Confessions was built by Joshua as an independent community project to give the Davao del Sur State College student community a warm, creative, music-driven space for unspoken thoughts.",
            },
          },
          {
            "@type": "Question",
            name: "What are Pokes on confessions?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A Poke is a lightweight, friendly tap on a confession. Tapping Poke increments the counter to let the author know someone read their story, with zero user tracking.",
            },
          },
          {
            "@type": "Question",
            name: "How many song replies can a confession receive?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Each confession can receive up to 500 anonymous song replies on its mixtape. The author can turn off replies when posting, or use their private Delete Key to remove individual replies and free up spots.",
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
    title: "Privacy Policy & Zero-IP Guarantee | DSSC Confessions",
    description:
      "Read our strict privacy policy: no user accounts, no raw IP logging, one-time deletion keys, and community moderation for DSSC.",
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
        name: "Privacy Policy & Zero-IP Guarantee | DSSC Confessions",
        url: `${siteUrl}/privacy`,
        description:
          "Read our strict privacy policy: no user accounts, no raw IP logging, and user-controlled deletion.",
        inLanguage: DEFAULT_LANG,
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
        inLanguage: DEFAULT_LANG,
        author: {
          "@type": "Person",
          name: CREATOR_INFO.name,
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
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
        inLanguage: DEFAULT_LANG,
        author: {
          "@type": "Person",
          name: CREATOR_INFO.name,
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
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
        inLanguage: DEFAULT_LANG,
        author: {
          "@type": "Person",
          name: CREATOR_INFO.name,
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
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
