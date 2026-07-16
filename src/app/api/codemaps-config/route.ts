import { NextResponse } from "next/server";
import {
  readCodeMapsConfig,
  writeCodeMapsConfig,
  invalidatePathCache,
  getProjectRootAbsolute,
  resolveDiagramFilePath,
} from "@/lib/codemaps-path";
import { restartDiagramWatcher } from "@/lib/file-watcher";
import { normalizeStackProfile } from "@/lib/codemaps-path";
import type { CodeMapsConfig } from "@/types/diagram";

export async function GET() {
  try {
    const config = await readCodeMapsConfig();
    const projectRootAbsolute = await getProjectRootAbsolute();
    const diagramPath = await resolveDiagramFilePath();
    return NextResponse.json({
      ...config,
      projectRootAbsolute,
      diagramPath,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read config" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<CodeMapsConfig>;
    if (
      typeof body.projectRoot !== "string" ||
      !body.projectRoot.trim()
    ) {
      return NextResponse.json(
        { error: "projectRoot is required" },
        { status: 400 },
      );
    }

    const next: CodeMapsConfig = {
      projectRoot: body.projectRoot.trim(),
      diagramRelativePath:
        typeof body.diagramRelativePath === "string" &&
        body.diagramRelativePath.trim()
          ? body.diagramRelativePath.trim()
          : ".codemaps/architecture.json",
      stackProfile:
        body.stackProfile !== undefined
          ? normalizeStackProfile(body.stackProfile)
          : undefined,
      syncGlobs: Array.isArray(body.syncGlobs) ? body.syncGlobs : undefined,
    };

    const saved = await writeCodeMapsConfig(next);
    invalidatePathCache();
    await restartDiagramWatcher();

    const projectRootAbsolute = await getProjectRootAbsolute();
    const diagramPath = await resolveDiagramFilePath();

    return NextResponse.json({
      ...saved,
      projectRootAbsolute,
      diagramPath,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save config" },
      { status: 500 },
    );
  }
}
