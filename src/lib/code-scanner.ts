import { promises as fs } from "fs";
import path from "path";
import type { StackProfile } from "@/types/diagram";
import { MAX_SCAN_PATHS } from "./drift-types";

const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  ".expo",
  "ios",
  "android",
  "coverage",
  ".turbo",
  "out",
]);

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

function isTestFile(name: string): boolean {
  return /\.(test|spec)\.(tsx?|jsx?)$/i.test(name);
}

function suggestIdFromPath(relPosix: string): string {
  const base = relPosix
    .replace(/\.(tsx?|jsx?)$/i, "")
    .replace(/\/(page|route|index)$/i, "")
    .replace(/^app\/api\//, "")
    .replace(/^app\//, "")
    .replace(/^src\/features\//, "")
    .replace(/\[|\]|\(|\)/g, "")
    .split("/")
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "unnamed";
}

async function walk(
  absDir: string,
  rootAbs: string,
  out: string[],
  truncated: { value: boolean },
): Promise<void> {
  if (truncated.value || out.length >= MAX_SCAN_PATHS) {
    truncated.value = true;
    return;
  }

  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (truncated.value || out.length >= MAX_SCAN_PATHS) {
      truncated.value = true;
      return;
    }
    if (IGNORE_DIR_NAMES.has(entry.name)) continue;
    if (entry.name.startsWith(".") && entry.name !== ".codemaps") continue;

    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      await walk(abs, rootAbs, out, truncated);
      continue;
    }
    if (!entry.isFile()) continue;
    if (isTestFile(entry.name)) continue;

    const rel = toPosix(path.relative(rootAbs, abs));
    out.push(rel);
  }
}

function matchNext(rel: string): boolean {
  // app/**/page.tsx|ts , app/api/**/route.ts|js
  if (/^app\/api\/.+\/route\.(ts|js|tsx|jsx)$/.test(rel)) return true;
  if (/^app\/api\/route\.(ts|js)$/.test(rel)) return true;
  if (/^app\/.+\/page\.(tsx|ts|jsx|js)$/.test(rel)) return true;
  if (/^app\/page\.(tsx|ts|jsx|js)$/.test(rel)) return true;
  return false;
}

function matchReactNative(rel: string): boolean {
  // Expo Router screens under app/ (skip _layout, +api, +html, etc.)
  if (rel.startsWith("app/")) {
    const name = rel.split("/").pop() ?? "";
    if (name.startsWith("_") || name.startsWith("+")) return false;
    if (/\.(tsx|ts|jsx|js)$/.test(name) && !isTestFile(name)) {
      // treat route files as candidates
      return true;
    }
  }
  // Feature folders: src/features/<name>/ (represented as the folder path)
  if (/^src\/features\/[^/]+$/.test(rel)) return true;
  return false;
}

/**
 * Collect candidate architecture paths relative to projectRoot.
 */
export async function scanCodePaths(
  projectRootAbs: string,
  stackProfile: StackProfile,
): Promise<{ paths: string[]; truncated: boolean }> {
  const truncated = { value: false };
  const allFiles: string[] = [];

  await walk(projectRootAbs, projectRootAbs, allFiles, truncated);

  // For RN features: also add feature directory paths as candidates
  if (stackProfile === "react-native") {
    const featuresDir = path.join(projectRootAbs, "src", "features");
    try {
      const entries = await fs.readdir(featuresDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          allFiles.push(toPosix(path.join("src/features", entry.name)));
        }
      }
    } catch {
      // no features dir
    }
  }

  const matcher = stackProfile === "react-native" ? matchReactNative : matchNext;
  const paths = [...new Set(allFiles.filter(matcher))].sort();

  return {
    paths: paths.slice(0, MAX_SCAN_PATHS),
    truncated: truncated.value || paths.length > MAX_SCAN_PATHS,
  };
}

export { suggestIdFromPath };
