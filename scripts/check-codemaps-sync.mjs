#!/usr/bin/env node
/**
 * Warns when application code changed but .codemaps architecture map did not.
 *
 * Config: .codemaps/config.json
 *   syncGlobs: string[]  — if empty/missing, check is skipped (exit 0)
 *
 * Usage:
 *   node scripts/check-codemaps-sync.mjs
 *   node scripts/check-codemaps-sync.mjs --staged
 *   CODEMAPS_SYNC_BASE=origin/main node scripts/check-codemaps-sync.mjs
 *   CODEMAPS_SYNC_ALLOW=1 node scripts/check-codemaps-sync.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const allow =
  args.has("--allow") ||
  process.env.CODEMAPS_SYNC_ALLOW === "1" ||
  process.env.CODEMAPS_SYNC_ALLOW === "true";
const staged = args.has("--staged");
const base = process.env.CODEMAPS_SYNC_BASE || "HEAD";

function readConfig() {
  const configPath = path.join(cwd, ".codemaps", "config.json");
  if (!existsSync(configPath)) {
    console.log("[codemaps-sync] No .codemaps/config.json — skip.");
    process.exit(0);
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.error("[codemaps-sync] Invalid config.json:", err.message);
    process.exit(1);
  }
}

/** Minimal glob: supports `foo/**`, `foo/*`, prefix `foo/`, exact file. */
function matchesGlob(relativePath, pattern) {
  const normalized = relativePath.replace(/\\/g, "/");
  const pat = pattern.replace(/\\/g, "/");

  if (pat.endsWith("/**")) {
    const prefix = pat.slice(0, -3);
    return normalized === prefix || normalized.startsWith(prefix + "/");
  }
  if (pat.endsWith("/*")) {
    const prefix = pat.slice(0, -2);
    if (!normalized.startsWith(prefix + "/")) return false;
    const rest = normalized.slice(prefix.length + 1);
    return rest.length > 0 && !rest.includes("/");
  }
  if (pat.endsWith("/")) {
    return normalized.startsWith(pat) || normalized + "/" === pat;
  }
  return normalized === pat || normalized.startsWith(pat + "/");
}

function gitDiffNames() {
  try {
    if (staged) {
      return execSync("git diff --cached --name-only --diff-filter=ACMR", {
        cwd,
        encoding: "utf-8",
      });
    }
    // Uncommitted + last commit vs base when base != HEAD is for CI
    if (base === "HEAD") {
      const unstaged = execSync("git diff --name-only --diff-filter=ACMR", {
        cwd,
        encoding: "utf-8",
      });
      const cached = execSync("git diff --cached --name-only --diff-filter=ACMR", {
        cwd,
        encoding: "utf-8",
      });
      return `${unstaged}\n${cached}`;
    }
    return execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
      cwd,
      encoding: "utf-8",
    });
  } catch (err) {
    console.error("[codemaps-sync] git diff failed:", err.message);
    process.exit(1);
  }
}

function main() {
  const config = readConfig();
  const syncGlobs = Array.isArray(config.syncGlobs) ? config.syncGlobs : [];
  if (syncGlobs.length === 0) {
    console.log(
      "[codemaps-sync] syncGlobs empty — skip (configure in .codemaps/config.json for mapped apps).",
    );
    process.exit(0);
  }

  const diagramRelative =
    typeof config.diagramRelativePath === "string" && config.diagramRelativePath.trim()
      ? config.diagramRelativePath.trim().replace(/\\/g, "/")
      : ".codemaps/architecture.json";

  const projectRoot =
    typeof config.projectRoot === "string" && config.projectRoot.trim()
      ? config.projectRoot.trim()
      : ".";

  const changed = gitDiffNames()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((f) => f.replace(/\\/g, "/"));

  if (changed.length === 0) {
    console.log("[codemaps-sync] No relevant file changes — OK.");
    process.exit(0);
  }

  // Paths as seen from repo root; if projectRoot is external absolute, only check diagramRelative in that root via env — for in-repo roots, prefix.
  const rootPrefix =
    projectRoot === "." || projectRoot === ""
      ? ""
      : path.isAbsolute(projectRoot)
        ? null
        : projectRoot.replace(/\\/g, "/").replace(/\/$/, "") + "/";

  if (rootPrefix === null) {
    console.log(
      "[codemaps-sync] Absolute projectRoot — run this check inside the mapped repo (or set relative projectRoot). Skip.",
    );
    process.exit(0);
  }

  const codeHits = [];
  for (const file of changed) {
    const rel = rootPrefix && file.startsWith(rootPrefix) ? file.slice(rootPrefix.length) : file;
    if (rootPrefix && !file.startsWith(rootPrefix) && projectRoot !== ".") {
      continue;
    }
    for (const glob of syncGlobs) {
      if (matchesGlob(rel, glob) || matchesGlob(file, glob)) {
        codeHits.push(file);
        break;
      }
    }
  }

  if (codeHits.length === 0) {
    console.log("[codemaps-sync] No syncGlob matches — OK.");
    process.exit(0);
  }

  const diagramPath = (rootPrefix + diagramRelative).replace(/\\/g, "/");
  const mapChanged = changed.some(
    (f) => f === diagramPath || f.endsWith("/" + diagramRelative) || f === diagramRelative,
  );

  if (mapChanged) {
    console.log("[codemaps-sync] Code + architecture map both changed — OK.");
    process.exit(0);
  }

  const message = [
    "[codemaps-sync] FAIL: application code changed without updating the architecture map.",
    `  Map expected: ${diagramPath}`,
    `  Code files (${codeHits.length}):`,
    ...codeHits.slice(0, 15).map((f) => `    - ${f}`),
    codeHits.length > 15 ? `    … +${codeHits.length - 15} more` : null,
    "",
    "  Fix: update .codemaps/architecture.json in the same change,",
    "  or confirm no arch impact (PR note: codemaps: no arch change),",
    "  or re-run with CODEMAPS_SYNC_ALLOW=1 / --allow.",
  ]
    .filter(Boolean)
    .join("\n");

  if (allow) {
    console.warn(message);
    console.warn("[codemaps-sync] ALLOWED via --allow / CODEMAPS_SYNC_ALLOW.");
    process.exit(0);
  }

  console.error(message);
  process.exit(1);
}

main();
