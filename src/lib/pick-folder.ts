import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { access, readdir, readFile, stat } from "node:fs/promises";
import type { StackProfile } from "@/types/diagram";

const execFileAsync = promisify(execFile);

export interface PickedProjectInfo {
  path: string;
  hasArchitecture: boolean;
  diagramRelativePath: string;
  stackProfile?: StackProfile;
  message?: string;
}

export interface DirListing {
  path: string;
  parent: string | null;
  entries: { name: string; path: string }[];
}

function normalizePickedPath(raw: string): string {
  return path.normalize(raw.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, ""));
}

async function pickWindows(initialPath?: string): Promise<string | null> {
  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "pick-folder-windows.ps1",
  );
  const args = [
    "-NoProfile",
    "-STA",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
  ];
  if (initialPath) args.push(initialPath);

  try {
    const { stdout } = await execFileAsync("powershell.exe", args, {
      // false: some Windows setups never surface WinForms when the host is hidden
      windowsHide: false,
      maxBuffer: 1024 * 1024,
      timeout: 300_000,
    });
    const picked = normalizePickedPath(stdout);
    return picked || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Nie udało się otworzyć okna wyboru folderu (Windows): ${message}`);
  }
}

async function pickMac(): Promise<string | null> {
  const { stdout } = await execFileAsync(
    "osascript",
    [
      "-e",
      'try\nPOSIX path of (choose folder with prompt "Wybierz folder projektu")\non error\nreturn ""\nend try',
    ],
    { timeout: 300_000 },
  );
  const picked = normalizePickedPath(stdout);
  return picked || null;
}

async function pickLinux(initialPath?: string): Promise<string | null> {
  const start = initialPath || os.homedir();
  try {
    const { stdout } = await execFileAsync(
      "zenity",
      [
        "--file-selection",
        "--directory",
        "--title=Wybierz folder projektu",
        `--filename=${start}${path.sep}`,
      ],
      { timeout: 300_000 },
    );
    const picked = normalizePickedPath(stdout);
    return picked || null;
  } catch {
    try {
      const { stdout } = await execFileAsync(
        "kdialog",
        ["--getexistingdirectory", start],
        { timeout: 300_000 },
      );
      const picked = normalizePickedPath(stdout);
      return picked || null;
    } catch {
      throw new Error(
        "Brak zenity/kdialog — użyj przeglądarki folderów w UI albo wpisz ścieżkę ręcznie.",
      );
    }
  }
}

/** Opens a native OS folder dialog on the machine running Next.js (local use). */
export async function pickFolderNative(
  initialPath?: string,
): Promise<string | null> {
  switch (process.platform) {
    case "win32":
      return pickWindows(initialPath);
    case "darwin":
      return pickMac();
    default:
      return pickLinux(initialPath);
  }
}

async function fileExists(abs: string): Promise<boolean> {
  try {
    await access(abs);
    return true;
  } catch {
    return false;
  }
}

/** List child directories for the in-app folder browser fallback. */
export async function listDirectories(dirPath: string): Promise<DirListing> {
  const normalized = path.normalize(dirPath.trim() || os.homedir());
  const st = await stat(normalized);
  if (!st.isDirectory()) {
    throw new Error("Ścieżka nie jest folderem");
  }

  const parentDir = path.dirname(normalized);
  const parent = parentDir !== normalized ? parentDir : null;

  const names = await readdir(normalized);
  const entries: { name: string; path: string }[] = [];

  for (const name of names) {
    if (name.startsWith(".")) continue;
    const full = path.join(normalized, name);
    try {
      const s = await stat(full);
      if (s.isDirectory()) entries.push({ name, path: full });
    } catch {
      // skip inaccessible
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return { path: normalized, parent, entries };
}

/** Inspect selected folder for .codemaps map + optional local config. */
export async function inspectPickedProject(
  projectRootAbs: string,
): Promise<PickedProjectInfo> {
  const diagramRelativePath = ".codemaps/architecture.json";
  const architectureAbs = path.join(projectRootAbs, diagramRelativePath);
  const hasArchitecture = await fileExists(architectureAbs);

  let stackProfile: StackProfile | undefined;
  const localConfigAbs = path.join(projectRootAbs, ".codemaps", "config.json");
  if (await fileExists(localConfigAbs)) {
    try {
      const raw = JSON.parse(await readFile(localConfigAbs, "utf8")) as {
        stackProfile?: string;
        diagramRelativePath?: string;
      };
      if (raw.stackProfile === "react-native" || raw.stackProfile === "next") {
        stackProfile = raw.stackProfile;
      }
    } catch {
      // ignore broken local config
    }
  }

  return {
    path: projectRootAbs,
    hasArchitecture,
    diagramRelativePath,
    stackProfile,
    message: hasArchitecture
      ? "Znaleziono .codemaps/architecture.json"
      : "Brak .codemaps/architecture.json w tym folderze — mapa może być pusta po zapisie",
  };
}
