import { NextResponse } from "next/server";
import { ensureDiagramFile, readDiagramFile, writeDiagramFile } from "@/lib/diagram-io";
import { layoutDiagram } from "@/lib/auto-layout";
import { formatValidationError, parseDiagram } from "@/lib/schema";

export async function GET() {
  try {
    const diagram = await ensureDiagramFile();
    const laidOut = layoutDiagram(diagram);
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
    const validationError = formatValidationError(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const diagram = parseDiagram(body);
    const laidOut = layoutDiagram(diagram);
    const saved = await writeDiagramFile(laidOut);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save diagram" },
      { status: 500 },
    );
  }
}
