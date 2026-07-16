import { promises as fs } from "fs";
import path from "path";
import { getProjectRootAbsolute, readCodeMapsConfig } from "./codemaps-path";
import { readDiagramFile } from "./diagram-io";
import { scanCodePaths, suggestIdFromPath } from "./code-scanner";
import type { DriftFinding, DriftReport } from "./drift-types";
import type { Diagram, StackProfile } from "@/types/diagram";

function toPosix(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function normalizeRef(ref: string): string {
  return toPosix(ref).replace(/\/$/, "");
}

/** path covered by codeRef (exact or prefix either way for folders). */
export function pathCoveredByCodeRef(filePath: string, codeRef: string): boolean {
  const p = normalizeRef(filePath);
  const r = normalizeRef(codeRef);
  if (!p || !r) return false;
  return p === r || p.startsWith(r + "/") || r.startsWith(p + "/");
}

async function pathExists(projectRootAbs: string, codeRef: string): Promise<boolean> {
  const abs = path.join(projectRootAbs, codeRef);
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

export async function buildDriftReport(options?: {
  projectRootAbs?: string;
  stackProfile?: StackProfile;
  diagram?: Diagram | null;
}): Promise<DriftReport> {
  const config = await readCodeMapsConfig();
  const stackProfile = options?.stackProfile ?? config.stackProfile ?? "next";
  const projectRootAbs =
    options?.projectRootAbs ?? (await getProjectRootAbsolute());

  const diagram =
    options?.diagram !== undefined
      ? options.diagram
      : await readDiagramFile();

  const { paths: scannedPaths, truncated } = await scanCodePaths(
    projectRootAbs,
    stackProfile,
  );

  const findings: DriftFinding[] = [];
  const codeRefs: { nodeId: string; codeRef: string }[] = [];

  if (diagram) {
    for (const node of diagram.nodes) {
      const ref = node.data?.codeRef;
      if (ref == null || String(ref).trim() === "") {
        if (node.data?.status === "existing") {
          findings.push({
            kind: "missing_codeRef",
            nodeId: node.id,
            codeRef: null,
            hint: `Węzeł existing bez codeRef — ustaw ścieżkę (np. app/... lub src/features/...)`,
          });
        }
        continue;
      }

      const codeRef = normalizeRef(String(ref));
      codeRefs.push({ nodeId: node.id, codeRef });

      const exists = await pathExists(projectRootAbs, codeRef);
      if (!exists) {
        findings.push({
          kind: "broken_codeRef",
          nodeId: node.id,
          codeRef,
          hint: `Brak pliku/folderu pod projectRoot/${codeRef}`,
        });
      }
    }
  }

  for (const scanned of scannedPaths) {
    const covered = codeRefs.some(({ codeRef }) =>
      pathCoveredByCodeRef(scanned, codeRef),
    );
    if (!covered) {
      findings.push({
        kind: "missing_on_map",
        path: scanned,
        hint: `Rozważ węzeł id="${suggestIdFromPath(scanned)}" z codeRef="${scanned.replace(/\/(page|route)\.(tsx?|jsx?|js)$/i, "").replace(/\/$/, "") || scanned}"`,
      });
    }
  }

  const summary = {
    missingOnMap: findings.filter((f) => f.kind === "missing_on_map").length,
    brokenCodeRef: findings.filter((f) => f.kind === "broken_codeRef").length,
    missingCodeRef: findings.filter((f) => f.kind === "missing_codeRef").length,
  };

  return {
    stackProfile,
    projectRoot: projectRootAbs,
    scannedAt: new Date().toISOString(),
    truncated,
    scannedPathCount: scannedPaths.length,
    findings,
    summary,
  };
}

export function formatDriftReportText(report: DriftReport): string {
  const lines: string[] = [
    `[codemaps-drift] profile=${report.stackProfile} root=${report.projectRoot}`,
    `[codemaps-drift] scanned=${report.scannedPathCount}${report.truncated ? " (TRUNCATED)" : ""}`,
    `[codemaps-drift] summary: missing_on_map=${report.summary.missingOnMap} broken_codeRef=${report.summary.brokenCodeRef} missing_codeRef=${report.summary.missingCodeRef}`,
  ];

  if (report.findings.length === 0) {
    lines.push("[codemaps-drift] OK — no drift findings.");
    return lines.join("\n");
  }

  for (const f of report.findings) {
    const parts = [
      f.kind,
      f.nodeId ? `node=${f.nodeId}` : null,
      f.path ? `path=${f.path}` : null,
      f.codeRef ? `codeRef=${f.codeRef}` : null,
      f.hint ? `hint=${f.hint}` : null,
    ].filter(Boolean);
    lines.push(`  - ${parts.join(" | ")}`);
  }

  return lines.join("\n");
}

/** Fail CLI/CI when there is actionable drift (not only missing_codeRef soft hints). */
export function driftReportHasBlockingFindings(report: DriftReport): boolean {
  return report.findings.some(
    (f) => f.kind === "missing_on_map" || f.kind === "broken_codeRef",
  );
}
