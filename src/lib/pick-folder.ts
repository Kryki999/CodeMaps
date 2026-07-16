import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { access, readFile } from "node:fs/promises";
import type { StackProfile } from "@/types/diagram";

const execFileAsync = promisify(execFile);

export interface PickedProjectInfo {
  path: string;
  hasArchitecture: boolean;
  diagramRelativePath: string;
  stackProfile?: StackProfile;
  message?: string;
}

function normalizePickedPath(raw: string): string {
  return path.normalize(raw.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, ""));
}

async function pickWindows(initialPath?: string): Promise<string | null> {
  const initial = initialPath
    ? initialPath.replace(/'/g, "''")
    : "";
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = 'Wybierz folder projektu (z .codemaps)'",
    "$dialog.ShowNewFolderButton = $false",
    initial ? `$dialog.SelectedPath = '${initial}'` : "",
    "$result = $dialog.ShowDialog()",
    "if ($result -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  [Console]::Out.Write($dialog.SelectedPath)",
    "}",
  ]
    .filter(Boolean)
    .join("; ");

  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-STA", "-Command", script],
    { windowsHide: true, maxBuffer: 1024 * 1024, timeout: 300_000 },
  );
  const picked = normalizePickedPath(stdout);
  return picked || null;
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
        "Brak zenity/kdialog — wpisz ścieżkę ręcznie albo zainstaluj zenity.",
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
