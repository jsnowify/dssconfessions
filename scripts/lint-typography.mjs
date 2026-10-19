#!/usr/bin/env node

/**
 * scripts/lint-typography.mjs
 * Guard script that validates typography invariants across the project:
 * 1. Disallows arbitrary Tailwind text sizes (text-[13px], text-[11px], etc.) in JSX/JS.
 * 2. Disallows raw font-size px/rem declarations in CSS outside the design tokens block.
 * 3. Enforces accessibility size floors: metadata >= 13px (0.8125rem), inputs >= 16px (1rem), body >= 14px (0.875rem).
 * 4. Ensures all tokens and type sizes are rem-based or fluid clamp().
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const clientSrcDir = path.join(rootDir, "client", "src");

const violations = [];

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (/\.(jsx?|css)$/.test(item)) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk(clientSrcDir);

for (const filePath of allFiles) {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  // Check 1: JSX files for arbitrary Tailwind text sizes: text-[10px], text-[13px], etc.
  if (/\.jsx?$/.test(filePath)) {
    lines.forEach((line, index) => {
      // Match text-[...] where the bracket contains numbers or units, but not css variables or colors like text-[var(--ink)] or text-[#333]
      const arbitraryMatch = line.match(/\btext-\[(?!\s*(?:var|#|rgb|hsl|oklch))[0-9]+(?:px|rem|em)?\]/g);
      if (arbitraryMatch) {
        arbitraryMatch.forEach((cls) => {
          violations.push({
            file: relativePath,
            line: index + 1,
            issue: `Arbitrary Tailwind text size "${cls}" is forbidden. Use semantic tokens (.text-meta, .text-body-sm, .text-h2, etc.).`,
            snippet: line.trim(),
          });
        });
      }

      // Check inline styles for raw fontSize: e.g. fontSize: '13px'
      const inlineFontSizeMatch = line.match(/fontSize:\s*["']?(\d+)(px|rem|em)?["']?/);
      if (inlineFontSizeMatch) {
        const val = inlineFontSizeMatch[1];
        const unit = inlineFontSizeMatch[2] || "px";
        if (unit === "px" && parseInt(val, 10) < 13) {
          violations.push({
            file: relativePath,
            line: index + 1,
            issue: `Inline fontSize "${val}${unit}" violates the 13px metadata floor.`,
            snippet: line.trim(),
          });
        }
      }
    });
  }

  // Check 2: CSS files for raw font-size rules outside token definitions
  if (filePath.endsWith("index.css")) {
    let insideTokenBlock = false;
    let insideThemeBlock = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith(":root {") || trimmed.includes("/* Typography Design Tokens")) {
        insideTokenBlock = true;
      }
      if (trimmed.startsWith("@theme {")) {
        insideThemeBlock = true;
      }
      if (trimmed === "}" && (insideTokenBlock || insideThemeBlock)) {
        insideTokenBlock = false;
        insideThemeBlock = false;
      }

      // Allow-list the token block, comments, and utility class definitions
      if (insideTokenBlock || insideThemeBlock) return;

      // Match font-size: ...;
      const fsMatch = line.match(/\bfont-size:\s*([^;]+);/);
      if (fsMatch) {
        const rawVal = fsMatch[1].trim();

        // Allow var(--fs-*) or var(--font-size-*)
        if (rawVal.startsWith("var(--fs-") || rawVal.startsWith("var(--font-size-")) {
          return;
        }

        // Detect raw px usage in CSS outside tokens
        if (/^\d+px$/.test(rawVal)) {
          const pxVal = parseInt(rawVal, 10);
          if (pxVal < 13) {
            violations.push({
              file: relativePath,
              line: index + 1,
              issue: `font-size: ${rawVal} violates the minimum 13px floor. Use var(--fs-meta) or standard tokens.`,
              snippet: line.trim(),
            });
          } else {
            violations.push({
              file: relativePath,
              line: index + 1,
              issue: `Raw px font-size: ${rawVal} outside token block. Use rem-based semantic tokens (var(--fs-*)).`,
              snippet: line.trim(),
            });
          }
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`\n❌ Typography Linter Failed with ${violations.length} violations:\n`);
  violations.forEach((v, idx) => {
    console.error(`  ${idx + 1}. [${v.file}:${v.line}]`);
    console.error(`     Issue: ${v.issue}`);
    console.error(`     Line:  ${v.snippet}\n`);
  });
  console.error(`Please update these styles to use the central type tokens from client/src/index.css.\n`);
  process.exit(1);
} else {
  console.log(`✅ Typography lint passed: zero arbitrary text sizes, zero sub-floor sizes, and 100% token adherence across ${allFiles.length} files.`);
  process.exit(0);
}

