import { NextResponse } from "next/server";
import os from "node:os";
import path from "node:path";
import { inspectPickedProject, listDirectories } from "@/lib/pick-folder";
import { getProjectRootAbsolute } from "@/lib/codemaps-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let dir = searchParams.get("path")?.trim();

    if (!dir) {
      try {
        const current = await getProjectRootAbsolute();
        dir = path.isAbsolute(current) ? current : os.homedir();
      } catch {
        dir = os.homedir();
      }
    }

    const listing = await listDirectories(dir);
    return NextResponse.json(listing);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nie udało się listować folderu",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string };
    const dir = typeof body.path === "string" ? body.path.trim() : "";
    if (!dir || !path.isAbsolute(dir)) {
      return NextResponse.json(
        { error: "Wymagana absolutna ścieżka folderu" },
        { status: 400 },
      );
    }

    const info = await inspectPickedProject(dir);
    return NextResponse.json({ cancelled: false, ...info });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nie udało się sprawdzić folderu",
      },
      { status: 500 },
    );
  }
}
