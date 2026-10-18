const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..");
const publicDir = path.join(rootDir, "client", "public");
const archiveJsonPath = path.join(rootDir, "client", "src", "content", "design-archive.json");
const manifestPath = path.join(publicDir, "site.webmanifest");

test("Design Archive & Logo System Suite", async (t) => {
  await t.test("design-archive.json content model invariants", () => {
    assert.ok(fs.existsSync(archiveJsonPath), "design-archive.json must exist");
    const content = JSON.parse(fs.readFileSync(archiveJsonPath, "utf8"));

    assert.ok(typeof content.intro === "string" && content.intro.length > 30, "intro must be an explanation");
    assert.ok(typeof content.disclaimer === "string" && content.disclaimer.length > 10, "disclaimer must exist");
    assert.ok(Array.isArray(content.versions) && content.versions.length >= 2, "must have at least 2 versions");

    const currentVersions = content.versions.filter((v) => v.current === true);
    assert.equal(currentVersions.length, 1, "exactly one version must be current");
    assert.equal(currentVersions[0].id, "v2", "v2 Sunny Mixtape must be current");

    // Version order: v1, v2
    assert.deepEqual(content.versions.map((v) => v.id), ["v1", "v2"]);
  });

  await t.test("all archive images exist on disk, have alt text, and respect size budgets", () => {
    const content = JSON.parse(fs.readFileSync(archiveJsonPath, "utf8"));

    for (const ver of content.versions) {
      assert.ok(ver.summary && ver.summary.length > 15, `summary required for ${ver.id}`);
      assert.ok(Array.isArray(ver.learned) && ver.learned.length >= 2, `learned lessons required for ${ver.id}`);
      assert.ok(Array.isArray(ver.images) && ver.images.length >= 8, `must have 8 image entries for ${ver.id}`);

      for (const img of ver.images) {
        assert.ok(["home", "browse", "confess", "about"].includes(img.page), `valid page ${img.page}`);
        assert.ok(["desktop", "mobile"].includes(img.device), `valid device ${img.device}`);
        assert.ok(img.alt && img.alt.length > 5, `non-empty alt for ${img.full}`);
        assert.ok(img.width > 0 && img.height > 0, `positive dimensions for ${img.full}`);

        const fullPath = path.join(publicDir, img.full.replace(/^\//, ""));
        const thumbPath = path.join(publicDir, img.thumb.replace(/^\//, ""));

        assert.ok(fs.existsSync(fullPath), `Full image must exist on disk: ${fullPath}`);
        assert.ok(fs.existsSync(thumbPath), `Thumb image must exist on disk: ${thumbPath}`);

        const fullStat = fs.statSync(fullPath);
        const thumbStat = fs.statSync(thumbPath);

        const fullBudget = img.device === "mobile" ? 120 * 1024 : 180 * 1024;
        const thumbBudget = 60 * 1024;

        assert.ok(
          fullStat.size <= fullBudget,
          `Image ${img.full} exceeds budget (${fullStat.size} > ${fullBudget})`,
        );
        assert.ok(
          thumbStat.size <= thumbBudget,
          `Thumb ${img.thumb} exceeds budget (${thumbStat.size} > ${thumbBudget})`,
        );
      }
    }
  });

  await t.test("Brand logo SVG assets satisfy architectural & security constraints", () => {
    const markSvgPath = path.join(publicDir, "logo-mark.svg");
    const monoSvgPath = path.join(publicDir, "logo-mark-mono.svg");
    const faviconSvgPath = path.join(publicDir, "favicon.svg");

    assert.ok(fs.existsSync(markSvgPath), "logo-mark.svg must exist");
    assert.ok(fs.existsSync(monoSvgPath), "logo-mark-mono.svg must exist");
    assert.ok(fs.existsSync(faviconSvgPath), "favicon.svg must exist");

    const markContent = fs.readFileSync(markSvgPath, "utf8");
    const monoContent = fs.readFileSync(monoSvgPath, "utf8");
    const faviconContent = fs.readFileSync(faviconSvgPath, "utf8");

    // Security: no script, foreignObject, or remote external links
    for (const svg of [markContent, monoContent, faviconContent]) {
      assert.ok(!svg.includes("<script"), "SVGs must not contain scripts");
      assert.ok(!svg.includes("<foreignObject"), "SVGs must not contain foreignObject");
      const cleanSvg = svg.replace("http://www.w3.org/2000/svg", "");
      assert.ok(!cleanSvg.includes("http://") && !cleanSvg.includes("https://"), "no remote links");
      assert.ok(!svg.includes("xlink:href"), "no remote links");
    }

    // Full mark: includes title, desc, and grooves group
    assert.ok(markContent.includes("<title>"), "mark must include <title>");
    assert.ok(markContent.includes("<desc>"), "mark must include <desc>");
    assert.ok(markContent.includes('class="grooves"'), "mark must include .grooves group for spin animation");

    // Mono mark: uses evenodd compound path cutout, NO masks
    assert.ok(monoContent.includes('fill-rule="evenodd"'), "mono mark must use evenodd compound path");
    assert.ok(!monoContent.includes("<mask"), "mono mark must NOT use SVG mask elements");
    assert.ok(monoContent.includes("currentColor"), "mono mark must use currentColor");

    // Favicon: simplified, compact
    assert.ok(faviconContent.length < 1536, "favicon.svg must be compact (< 1.5KB)");
  });

  await t.test("site.webmanifest conforms to PWA specification", () => {
    assert.ok(fs.existsSync(manifestPath), "site.webmanifest must exist");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    assert.equal(manifest.name, "DSSC Confessions");
    assert.equal(manifest.short_name, "DSSConfessions");
    assert.equal(manifest.theme_color, "#F6F9FF");
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4);

    const maskable = manifest.icons.filter((i) => i.purpose === "maskable");
    assert.ok(maskable.length >= 2, "must provide maskable icons");
  });

  await t.test("Privacy verification: zero real user content in archive dataset and capture script", () => {
    const archiveRaw = fs.readFileSync(archiveJsonPath, "utf8");
    const captureRaw = fs.readFileSync(path.join(rootDir, "scripts", "capture-design-archive.mjs"), "utf8");

    // Verify that student emails or personal phone numbers do not appear
    assert.ok(!archiveRaw.includes("@dssc.edu.ph"));
    assert.ok(!archiveRaw.includes("0917"));
    assert.ok(!archiveRaw.includes("0928"));
    assert.ok(!captureRaw.includes("@dssc.edu.ph"));
    assert.ok(!captureRaw.includes("0917"));
    assert.ok(!captureRaw.includes("0928"));

    // Verify mock neutral placeholders are present in capture pipeline
    assert.ok(captureRaw.includes("SAMPLE"));
    assert.ok(captureRaw.includes("ANONYMOUS"));
    assert.ok(captureRaw.includes("Sample Song"));
  });
});
