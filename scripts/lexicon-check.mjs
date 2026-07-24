#!/usr/bin/env node
// Lexicon gate for the product surface (specs/00-final-plan.md A.1).
// Terms are underwriting enums; price never moves with identity. Any hit here
// is a submission risk, so this exits non-zero.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["apps", "packages", "README.md"];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", "coverage"]);
const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|html|css)$/;

const PATTERNS = [
  /discountPercent/i,
  /%\s*off/i,
  /[-−]1[05]\s*%/,
  /elite\s+discount/i,
  /cheaper\s+for\s+humans/i,
  /trust\s+score/i,
  /sybil\s+score/i,
  /agent\s+reputation/i,
];

function* walk(path) {
  const st = statSync(path, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isFile()) {
    if (SCAN_EXT.test(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path)) {
    if (SKIP_DIRS.has(entry)) continue;
    yield* walk(join(path, entry));
  }
}

const hits = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const re of PATTERNS) {
        if (re.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
      }
    });
  }
}

if (hits.length) {
  console.error("lexicon violations on the product surface:");
  for (const hit of hits) console.error("  " + hit);
  process.exit(1);
}
console.log("lexicon clean: apps, packages, README.md");
