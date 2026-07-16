import { NextResponse } from "next/server";
import {
  ensureDiagramFile,
  migrateDiagram,
  writeDiagramFile,
} from "@/lib/diagram-io";
import { layoutMissingPositions } from "@/lib/auto-layout";

export async function GET() {
  try {
    const diagram = await ensureDiagramFile();
    const laidOut = layoutMissingPositions(diagram);
    return NextResponse.json(laidOut);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read diagram" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const migrated = migrateDiagram(body);
    const laidOut = layoutMissingPositions(migrated);
    const saved = await writeDiagramFile(laidOut);
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save diagram";
    const status = message.startsWith("Invalid diagram") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
