import { NODE_DIMENSIONS } from "@/lib/constants";
import type { DiagramEdge, DiagramNode, Position } from "@/types/diagram";
import type { Edge } from "@xyflow/react";
import type { ArchitectureEdgeData } from "@/lib/flow-edge-adapters";

const NODE_W = NODE_DIMENSIONS.width;
const NODE_H = NODE_DIMENSIONS.height;

/** Lateral spacing between parallel smooth-step corridors (px). */
export const EDGE_ROUTE_SPREAD = 26;

function nodeCenter(position: Position): { x: number; y: number } {
  return {
    x: position.x + NODE_W / 2,
    y: position.y + NODE_H / 2,
  };
}

/**
 * Pick connection sides so edges leave toward the neighbor
 * (avoids all lines stacking on the same mid-handle).
 * Preserves explicit handles already stored on the edge.
 */
export function pickHandlesForNodes(
  sourcePos: Position,
  targetPos: Position,
): { sourceHandle: string; targetHandle: string } {
  const sc = nodeCenter(sourcePos);
  const tc = nodeCenter(targetPos);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right-source", targetHandle: "left-target" }
      : { sourceHandle: "left-source", targetHandle: "right-target" };
  }

  return dy >= 0
    ? { sourceHandle: "bottom-source", targetHandle: "top-target" }
    : { sourceHandle: "top-source", targetHandle: "bottom-target" };
}

/**
 * Assign routeIndex / routeCount so parallel edges get staggered midpoints.
 * Groups by target (incoming fan-in) — the usual spaghetti in architecture maps.
 */
export function annotateEdgeRoutes(
  edges: Edge<ArchitectureEdgeData>[],
): Edge<ArchitectureEdgeData>[] {
  const byTarget = new Map<string, string[]>();
  for (const edge of edges) {
    const list = byTarget.get(edge.target) ?? [];
    list.push(edge.id);
    byTarget.set(edge.target, list);
  }

  for (const ids of byTarget.values()) {
    ids.sort();
  }

  return edges.map((edge) => {
    const group = byTarget.get(edge.target) ?? [edge.id];
    const routeIndex = Math.max(0, group.indexOf(edge.id));
    const routeCount = group.length;
    return {
      ...edge,
      data: {
        ...edge.data,
        routeIndex,
        routeCount,
      },
    };
  });
}

/**
 * Enrich flow edges with smart handles (if missing) + route stagger metadata.
 */
export function enrichFlowEdges(
  edges: Edge<ArchitectureEdgeData>[],
  nodes: DiagramNode[],
): Edge<ArchitectureEdgeData>[] {
  const posById = new Map<string, Position>();
  for (const node of nodes) {
    if (node.position) posById.set(node.id, node.position);
  }

  const withHandles = edges.map((edge) => {
    const hasHandles = Boolean(edge.sourceHandle && edge.targetHandle);
    if (hasHandles) return edge;

    const sourcePos = posById.get(edge.source);
    const targetPos = posById.get(edge.target);
    if (!sourcePos || !targetPos) return edge;

    const handles = pickHandlesForNodes(sourcePos, targetPos);
    return {
      ...edge,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
    };
  });

  return annotateEdgeRoutes(withHandles);
}

/** Same handle picking for persisted diagram edges (optional write-back later). */
export function suggestHandlesForDiagramEdge(
  edge: DiagramEdge,
  nodes: DiagramNode[],
): Pick<DiagramEdge, "sourceHandle" | "targetHandle"> | null {
  if (edge.sourceHandle && edge.targetHandle) return null;
  const source = nodes.find((n) => n.id === edge.source);
  const target = nodes.find((n) => n.id === edge.target);
  if (!source?.position || !target?.position) return null;
  return pickHandlesForNodes(source.position, target.position);
}
