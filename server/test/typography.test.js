const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..", "..");
const cssPath = path.join(rootDir, "client", "src", "index.css");
const hookPath = path.join(rootDir, "client", "src", "hooks", "useReaderFont.js");
const togglePath = path.join(rootDir, "client", "src", "components", "ui", "ReaderFontToggle.jsx");
const mainPath = path.join(rootDir, "client", "src", "main.jsx");
const cardPath = path.join(rootDir, "client", "src", "components", "ui", "ConfessionCard.jsx");
const tracklistPath = path.join(rootDir, "client", "src", "components", "ui", "SongTracklist.jsx");

test("Typography System & Easy-Read Reader Font Suite", async (t) => {
  await t.test("index.css defines all required scale tokens, optical ratios, and reader font rules", () => {
    assert.ok(fs.existsSync(cssPath), "client/src/index.css must exist");
    const css = fs.readFileSync(cssPath, "utf8");

    // Scale tokens in :root
    const requiredTokens = [
      "--fs-display",
      "--fs-h1",
      "--fs-h2",
      "--fs-h3",
      "--fs-body-lg",
      "--fs-body",
      "--fs-body-sm",
      "--fs-meta",
      "--fs-label",
      "--fs-input",
      "--fs-button",
      "--fs-button-sm",
      "--fs-nav",
      "--fs-overline",
      "--fs-message-hand",
      "--fs-message-inter",
    ];

    for (const token of requiredTokens) {
      assert.ok(css.includes(token), `index.css must declare token ${token}`);
    }

    // Dynamic reader font tokens
    assert.ok(css.includes("--font-message: var(--font-handwritten)"), "Default message font is handwriting");
    assert.ok(css.includes('--fs-message: var(--fs-message-hand)'), "Default message size is handwriting size");
    assert.ok(css.includes('[data-reader-font="inter"]'), "Attribute selector [data-reader-font='inter'] must exist");
    assert.ok(
      css.includes('--font-message: var(--font-sans)') || css.includes('[data-reader-font="inter"] {\n  --font-message: var(--font-sans)'),
      "Easy-read mode switches --font-message to sans font",
    );
    assert.ok(
      css.includes('--fs-message: var(--fs-message-inter)'),
      "Easy-read mode switches --fs-message to inter optical size",
    );

    // Tilt neutralization in Easy-Read mode
    assert.ok(
      css.includes('[data-reader-font="inter"] .record-card') && css.includes("transform: none !important"),
      "Easy-read mode must neutralize decorative card tilt for maximum readability",
    );

    // Reading measure
    assert.ok(css.includes("--measure-long: 65ch"), "Reading measure must define 65ch maximum line length");
    assert.ok(css.includes(".long-form"), ".long-form utility class must exist");

    // Semantic utility classes
    const utilities = [
      ".text-display",
      ".text-h1",
      ".text-h2",
      ".text-h3",
      ".text-body-lg",
      ".text-body",
      ".text-body-sm",
      ".text-meta",
      ".text-label",
      ".text-input",
      ".text-button",
      ".text-button-sm",
      ".text-nav",
      ".text-overline",
      ".read-text",
    ];

    for (const cls of utilities) {
      assert.ok(css.includes(cls), `index.css must declare utility class ${cls}`);
    }
  });

  await t.test("useReaderFont hook conforms to localStorage, a11y, and cross-tab contract", () => {
    assert.ok(fs.existsSync(hookPath), "client/src/hooks/useReaderFont.js must exist");
    const code = fs.readFileSync(hookPath, "utf8");

    // Key invariant
    assert.ok(code.includes('"reader-font"'), "Storage key must be reader-font");
    assert.ok(code.includes('data-reader-font'), "Must set data-reader-font attribute on document.documentElement");
    assert.ok(code.includes('prefers-contrast'), "Must inspect prefers-contrast media query");
    assert.ok(code.includes('storage'), "Must attach storage event listener for cross-tab sync");
    assert.ok(code.includes('try') && code.includes('catch'), "Must wrap storage access in try/catch for private browsing safety");
  });

  await t.test("main.jsx initializes data-reader-font on documentElement prior to render", () => {
    assert.ok(fs.existsSync(mainPath), "client/src/main.jsx must exist");
    const code = fs.readFileSync(mainPath, "utf8");

    assert.ok(code.includes('applyReaderFontToDocument'), "main.jsx must apply reader font to prevent hydration flash");
    assert.ok(code.includes('getInitialReaderFont'), "main.jsx must read initial reader font before mount");
  });

  await t.test("ReaderFontToggle component satisfies WAI-ARIA, variants, and accessibility rules", () => {
    assert.ok(fs.existsSync(togglePath), "client/src/components/ui/ReaderFontToggle.jsx must exist");
    const code = fs.readFileSync(togglePath, "utf8");

    // WAI-ARIA Invariants
    assert.ok(code.includes('role="radiogroup"'), "Must use role=radiogroup");
    assert.ok(code.includes('role="radio"'), "Options must have role=radio");
    assert.ok(code.includes('aria-checked='), "Options must bind aria-checked");
    assert.ok(code.includes('aria-live="polite"'), "Must include live region for screen-reader announcements");
    assert.ok(code.includes('aria-describedby='), "Must associate helper description with aria-describedby");

    // Keyboard support: arrows, Home, End
    assert.ok(code.includes('ArrowRight') && code.includes('ArrowLeft'), "Must support keyboard arrow navigation");
    assert.ok(code.includes('Home') && code.includes('End'), "Must support Home and End keys for rapid switching");

    // Anatomy: sliding thumb & live font preview
    assert.ok(code.includes('reader-toggle__thumb'), "Must render sliding selection thumb");
    assert.ok(code.includes('reader-toggle__label--hand'), "Must apply handwriting label class");
    assert.ok(code.includes('reader-toggle__label--inter'), "Must apply inter label class");

    // Scroll anchoring & cross-fade
    assert.ok(code.includes('font-switching'), "Must add font-switching class for cross-fade");
    assert.ok(code.includes('requestAnimationFrame'), "Must use requestAnimationFrame for scroll anchoring");
    assert.ok(code.includes('scrollBy'), "Must apply scroll offset correction if layout shifts");

    // Variants support
    assert.ok(code.includes('variant = "list"'), "Default variant must be list");
    assert.ok(code.includes('reader-toggle--${variant}'), "Must apply variant CSS class modifier");
  });

  await t.test("ReaderFontToggle is mounted in all designated views without duplicate instances", () => {
    const homePath = path.join(rootDir, "client", "src", "views", "HomeView.jsx");
    const browsePath = path.join(rootDir, "client", "src", "views", "BrowseView.jsx");
    const detailsPath = path.join(rootDir, "client", "src", "views", "DetailsView.jsx");
    const submitPath = path.join(rootDir, "client", "src", "views", "SubmitView.jsx");

    const homeCode = fs.readFileSync(homePath, "utf8");
    const browseCode = fs.readFileSync(browsePath, "utf8");
    const detailsCode = fs.readFileSync(detailsPath, "utf8");
    const submitCode = fs.readFileSync(submitPath, "utf8");

    // Home: variant="list" exactly once
    const homeMatches = homeCode.match(/<ReaderFontToggle[^>]*\/>/g) || [];
    assert.equal(homeMatches.length, 1, "HomeView must have exactly one ReaderFontToggle");
    assert.ok(homeMatches[0].includes('variant="list"'), "HomeView must use variant='list'");

    // Browse: variant="list" exactly once
    const browseMatches = browseCode.match(/<ReaderFontToggle[^>]*\/>/g) || [];
    assert.equal(browseMatches.length, 1, "BrowseView must have exactly one ReaderFontToggle");
    assert.ok(browseMatches[0].includes('variant="list"'), "BrowseView must use variant='list'");

    // Details: variant="toolbar" exactly once
    const detailsMatches = detailsCode.match(/<ReaderFontToggle[^>]*\/>/g) || [];
    assert.equal(detailsMatches.length, 1, "DetailsView must have exactly one ReaderFontToggle");
    assert.ok(detailsMatches[0].includes('variant="toolbar"'), "DetailsView must use variant='toolbar'");

    // Submit: variant="preview" exactly once
    const submitMatches = submitCode.match(/<ReaderFontToggle[^>]*\/>/g) || [];
    assert.equal(submitMatches.length, 1, "SubmitView must have exactly one ReaderFontToggle");
    assert.ok(submitMatches[0].includes('variant="preview"'), "SubmitView must use variant='preview'");
  });

  await t.test("ConfessionCard and SongTracklist apply .read-text to confession and reply message text", () => {
    assert.ok(fs.existsSync(cardPath), "ConfessionCard.jsx must exist");
    const cardCode = fs.readFileSync(cardPath, "utf8");
    assert.ok(cardCode.includes("read-text"), "ConfessionCard message must have read-text class");

    assert.ok(fs.existsSync(tracklistPath), "SongTracklist.jsx must exist");
    const tracklistCode = fs.readFileSync(tracklistPath, "utf8");
    assert.ok(tracklistCode.includes("read-text"), "SongTracklist reply note must have read-text class");
  });

  await t.test("lint-typography script executes with zero violations", () => {
    const linterScriptPath = path.join(rootDir, "scripts", "lint-typography.mjs");
    assert.ok(fs.existsSync(linterScriptPath), "scripts/lint-typography.mjs must exist");

    // Run lint script directly
    const output = execSync("node scripts/lint-typography.mjs", {
      cwd: rootDir,
      encoding: "utf8",
    });

    assert.ok(
      output.includes("Typography lint passed"),
      `Typography lint must pass without violations. Output:\n${output}`,
    );
  });
});
