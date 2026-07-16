import { promises as fs } from "fs";
import path from "path";
import { DIAGRAM_VERSION } from "./constants";
import { resolveDiagramFilePath } from "./codemaps-path";
import { migrateDiagram } from "./diagram-migrate";
import {
  createEmptyDiagram,
  parseDiagram,
  type ValidatedDiagram,
} from "./schema";
import type { Diagram } from "@/types/diagram";

export { migrateDiagram } from "./diagram-migrate";

export async function getDiagramFilePath(): Promise<string> {
  return resolveDiagramFilePath();
}

export async function readDiagramFile(): Promise<ValidatedDiagram | null> {
  const filePath = await getDiagramFilePath();

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const content = raw.replace(/^\uFEFF/, "");
    const json = JSON.parse(content) as unknown;
    return migrateDiagram(json);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeDiagramFile(diagram: Diagram): Promise<ValidatedDiagram> {
  const filePath = await getDiagramFilePath();
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  const validated = parseDiagram({
    ...diagram,
    version: DIAGRAM_VERSION,
    metadata: {
      ...diagram.metadata,
      updatedAt: new Date().toISOString(),
    },
  });

  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(validated, null, 2), "utf-8");
  await fs.rename(tempPath, filePath);

  return validated;
}

export async function ensureDiagramFile(): Promise<ValidatedDiagram> {
  const existing = await readDiagramFile();
  if (existing) return existing;

  const empty = createEmptyDiagram();
  return writeDiagramFile(empty);
}
