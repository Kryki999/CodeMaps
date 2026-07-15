import type { Diagram } from "@/types/diagram";

export const MAX_HISTORY_SIZE = 50;

export function cloneDiagram(diagram: Diagram): Diagram {
  return JSON.parse(JSON.stringify(diagram)) as Diagram;
}

export function generateEdgeId(source: string, target: string): string {
  const base = `${source}-to-${target}`;
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${suffix}`;
}
