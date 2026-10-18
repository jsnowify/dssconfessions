# DSSConfessions Documentation Index

Welcome to the internal documentation repository for **DSSConfessions**. These documents guide human developers and AI assistants through the architecture, user interface patterns, bug histories, and operational runbooks.

---

## Architecture & AI Developer Guides

- **[AI Context & Codebase Map](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/AI-CONTEXT.md)**: System overview, directory hierarchy, data flow, serverless runtime model, and critical pitfalls.
- **[AGENTS.md (Root)](file:///c:/Coding/JavaScript/Project/dss-confessions/AGENTS.md)**: Rules, constraints, and instructions for automated AI agents modifying this codebase.
- **[Changelog](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/CHANGELOG.md)**: Historical record of updates, refactors, and feature additions.

---

## Features & Interactions

- **[Unlimited Poke Feature](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/features/poke.md)**: Detailed specification for the unlimited, counted poke interaction, client burst batching (~400ms), optimistic UI, anti-flood protection, database RPC, and deprecation of `poke_log` and `POKE_HASH_SECRET`.
- **[Anonymous Author Features](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/features.md)**: One-time delete keys, community moderation reports, song reply threads, and Open Graph previews.
- **[Trending Searches](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/trending-searches.md)**: Atomic search query tracking and trending search chips.

---

- **[Design Archive](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/design-archive.md)**: Historical milestone versions (v1 Black & White Brutalist, v2 Sunny Mixtape), creative revamp rationale, automated privacy-preserving capture pipeline, and zero-initial-weight footer disclosure panel.
- **[Logo System & Brand Identity](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/brand/logo.md)**: Vinyl Speech Bubble brand mark, monochrome compound path vector rules (`currentColor` + `evenodd`), asset specifications, `<Logo />` component, and interactive micro-animations.
- **[Technical SEO & PWA](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/seo/technical.md)**: Metadata, favicons, site.webmanifest, JSON-LD schemas, and the automated `npm run seo:check` verification pipeline.
- **[Mixtape Scrubber & Hidden Scrollbars](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/ui/scroll-scrubber.md)**: Custom bottom-center floating music-player scroll control (rewind button, wavy progress track, spinning vinyl playhead, pretend timestamp), universal scrollbar hiding via `.no-scrollbar`, and ARIA slider contract.
- **[Custom Select & Dropdowns](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/ui/select.md)**: Neo-brutalist select dropdown, WAI-ARIA combobox implementation, hidden scrollbars, CSS fade hints (`.scroll-fade-hints`), and native OS mobile picker fallback.

---

## Operations & Debugging

- **[Bug Audit & Fix Report](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/BUGS.md)**: Root-cause analysis, history stack navigation fixes (BUG-001 through BUG-008), serverless pitfalls, and known constraints.
- **[Operations & Deployment](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/operations.md)**: Vercel serverless deployment instructions, environment variables, and live verification.
- **[Schema Repair Runbook](file:///c:/Coding/JavaScript/Project/dss-confessions/docs/schema-repair.md)**: Database health check guide, idempotent catch-up migrations, and `npm run check:schema`.

