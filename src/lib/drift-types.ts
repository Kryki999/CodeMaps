import type { StackProfile } from "@/types/diagram";

export type DriftKind =
  | "missing_on_map"
  | "broken_codeRef"
  | "missing_codeRef";

export interface DriftFinding {
  kind: DriftKind;
  /** Relative path on disk (scanned file/dir) */
  path?: string;
  nodeId?: string;
  codeRef?: string | null;
  /** Suggested kebab-case id or remediation hint */
  hint?: string;
}

export interface DriftReport {
  stackProfile: StackProfile;
  projectRoot: string;
  scannedAt: string;
  truncated: boolean;
  scannedPathCount: number;
  findings: DriftFinding[];
  summary: {
    missingOnMap: number;
    brokenCodeRef: number;
    missingCodeRef: number;
  };
}

export const MAX_SCAN_PATHS = 500;
