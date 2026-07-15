import type { DiagramEdge } from "@/types/diagram";
import type { Edge } from "@xyflow/react";

export interface ArchitectureEdgeData extends Record<string, unknown> {
  label?: string;
  edgeType?: string;
  dashed?: boolean;
}

export function diagramEdgeToFlowEdge(edge: DiagramEdge): Edge<ArchitectureEdgeData> {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type ?? "default",
    label: edge.label,
    animated: edge.animated ?? false,
    data: {
      label: edge.label,
      edgeType: edge.type,
      dashed: edge.dashed ?? false,
    },
    style: edge.dashed ? { strokeDasharray: "6 4" } : undefined,
  };
}
