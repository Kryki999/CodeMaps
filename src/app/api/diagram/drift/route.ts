import { NextResponse } from "next/server";
import { buildDriftReport } from "@/lib/drift-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const report = await buildDriftReport();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to build drift report",
      },
      { status: 500 },
    );
  }
}
