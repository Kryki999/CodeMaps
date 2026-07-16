import { promises as fs } from "fs";
import path from "path";
import {
  CODEMAPS_CONFIG_PATH,
  DEFAULT_DIAGRAM_RELATIVE_PATH,
  STACK_PROFILES,
} from "./constants";
import type { CodeMapsConfig, StackProfile } from "@/types/diagram";

const DEFAULT_CONFIG: CodeMapsConfig = {
  projectRoot: ".",
  diagramRelativePath: DEFAULT_DIAGRAM_RELATIVE_PATH,
  stackProfile: "next",
  syncGlobs: [],
};

export function normalizeStackProfile(value: unknown): StackProfile {
  if (typeof value === "string" && (STACK_PROFILES as readonly string[]).includes(value)) {
    return value as StackProfile;
  }
  return "next";
}

let cachedConfig: CodeMapsConfig | null = null;
let cachedConfigMtimeMs: number | null = null;

function resolveFromCwd(...parts: string[]): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), ...parts);
}

export function invalidatePathCache(): void {
  cachedConfig = null;
  cachedConfigMtimeMs = null;
}

export async function readCodeMapsConfig(): Promise<CodeMapsConfig> {
  const configPath = resolveFromCwd(CODEMAPS_CONFIG_PATH);

  try {
    const stat = await fs.stat(configPath);
    if (
      cachedConfig &&
      cachedConfigMtimeMs !== null &&
      stat.mtimeMs === cachedConfigMtimeMs
    ) {
      return cachedConfig;
    }

    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CodeMapsConfig>;
    const config: CodeMapsConfig = {
      projectRoot:
        typeof parsed.projectRoot === "string" && parsed.projectRoot.trim()
          ? parsed.projectRoot.trim()
          : DEFAULT_CONFIG.projectRoot,
      diagramRelativePath:
        typeof parsed.diagramRelativePath === "string" &&
        parsed.diagramRelativePath.trim()
          ? parsed.diagramRelativePath.trim()
          : DEFAULT_CONFIG.diagramRelativePath,
      syncGlobs: Array.isArray(parsed.syncGlobs)
        ? parsed.syncGlobs.filter((g): g is string => typeof g === "string")
        : undefined,
      stackProfile: normalizeStackProfile(parsed.stackProfile),
    };

    // Env override for project root (useful for Clubify / CI)
    const envRoot = process.env.CODEMAPS_PROJECT_ROOT?.trim();
    if (envRoot) {
      config.projectRoot = envRoot;
    }

    cachedConfig = config;
    cachedConfigMtimeMs = stat.mtimeMs;
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const config = { ...DEFAULT_CONFIG };
      const envRoot = process.env.CODEMAPS_PROJECT_ROOT?.trim();
      if (envRoot) config.projectRoot = envRoot;
      cachedConfig = config;
      cachedConfigMtimeMs = null;
      return config;
    }
    throw error;
  }
}

export async function writeCodeMapsConfig(config: CodeMapsConfig): Promise<CodeMapsConfig> {
  const configPath = resolveFromCwd(CODEMAPS_CONFIG_PATH);
  await fs.mkdir(path.dirname(configPath), { recursive: true });

  // Preserve fields if caller omitted them (e.g. UI only edits paths)
  let existingSyncGlobs: string[] | undefined;
  let existingStackProfile: StackProfile | undefined;
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const prev = JSON.parse(raw) as Partial<CodeMapsConfig>;
    if (Array.isArray(prev.syncGlobs)) {
      existingSyncGlobs = prev.syncGlobs.filter((g): g is string => typeof g === "string");
    }
    if (prev.stackProfile !== undefined) {
      existingStackProfile = normalizeStackProfile(prev.stackProfile);
    }
  } catch {
    // no existing file
  }

  const normalized: CodeMapsConfig = {
    projectRoot: config.projectRoot.trim() || ".",
    diagramRelativePath:
      config.diagramRelativePath.trim() || DEFAULT_DIAGRAM_RELATIVE_PATH,
    syncGlobs: config.syncGlobs ?? existingSyncGlobs ?? [],
    stackProfile: config.stackProfile
      ? normalizeStackProfile(config.stackProfile)
      : (existingStackProfile ?? "next"),
  };

  const tempPath = `${configPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf-8");
  await fs.rename(tempPath, configPath);

  invalidatePathCache();
  cachedConfig = normalized;
  return normalized;
}

export async function getProjectRootAbsolute(): Promise<string> {
  const config = await readCodeMapsConfig();
  if (path.isAbsolute(config.projectRoot)) {
    return path.normalize(config.projectRoot);
  }
  return resolveFromCwd(config.projectRoot);
}

export async function resolveDiagramFilePath(): Promise<string> {
  const config = await readCodeMapsConfig();
  const projectRoot = await getProjectRootAbsolute();
  return path.join(projectRoot, config.diagramRelativePath);
}

/** Sync helper for call sites that already awaited config once. */
export function joinDiagramPath(projectRoot: string, diagramRelativePath: string): string {
  return path.join(projectRoot, diagramRelativePath);
}
