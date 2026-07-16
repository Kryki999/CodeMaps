import { NextResponse } from "next/server";
import { ensureDiagramFile } from "@/lib/diagram-io";
import { sliceDiagram } from "@/lib/hierarchy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("nodeId");
    const nodeId =
      raw === null || raw === "" || raw === "null" || raw === "__root__"
        ? null
        : raw;

    const diagram = await ensureDiagramFile();
    const slice = sliceDiagram(diagram, nodeId);

    if (nodeId && !slice.focus) {
      return NextResponse.json(
        { error: `Node '${nodeId}' not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      version: diagram.version,
      metadata: diagram.metadata,
      ...slice,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to slice diagram" },
      { status: 500 },
    );
  }
}
