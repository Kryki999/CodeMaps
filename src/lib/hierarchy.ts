import { ROOT_PARENT_KEY } from "./constants";
import type { Diagram, DiagramEdge, DiagramNode, Viewport } from "@/types/diagram";

export function parentKey(parentId: string | null | undefined): string {
  return parentId ?? ROOT_PARENT_KEY;
}

export function getChildren(
  nodes: DiagramNode[],
  parentId: string | null,
): DiagramNode[] {
  return nodes.filter((n) => (n.parentId ?? null) === parentId);
}

export function countChildren(nodes: DiagramNode[], parentId: string): number {
  return nodes.filter((n) => (n.parentId ?? null) === parentId).length;
}

export function filterDiagramByParent(
  diagram: Diagram,
  activeParentId: string | null,
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const nodes = getChildren(diagram.nodes, activeParentId);
  const visibleIds = new Set(nodes.map((n) => n.id));
  const edges = diagram.edges.filter(
    (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
  );
  return { nodes, edges };
}

/** Edges that cross out of the current level (one end visible, one not). */
export function getCrossLevelEdges(
  diagram: Diagram,
  activeParentId: string | null,
): DiagramEdge[] {
  const visibleIds = new Set(
    getChildren(diagram.nodes, activeParentId).map((n) => n.id),
  );
  return diagram.edges.filter((e) => {
    const srcIn = visibleIds.has(e.source);
    const tgtIn = visibleIds.has(e.target);
    return srcIn !== tgtIn;
  });
}

export function countExternalConnections(
  diagram: Diagram,
  nodeId: string,
  activeParentId: string | null,
): number {
  const visibleIds = new Set(
    getChildren(diagram.nodes, activeParentId).map((n) => n.id),
  );
  return diagram.edges.filter((e) => {
    const isEndpoint = e.source === nodeId || e.target === nodeId;
    if (!isEndpoint) return false;
    const other = e.source === nodeId ? e.target : e.source;
    return !visibleIds.has(other);
  }).length;
}

export function buildBreadcrumbTrail(
  nodes: DiagramNode[],
  activeParentId: string | null,
): { id: string | null; label: string }[] {
  const trail: { id: string | null; label: string }[] = [
    { id: null, label: "System" },
  ];
  if (!activeParentId) return trail;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const chain: DiagramNode[] = [];
  let current: string | null = activeParentId;
  const guard = new Set<string>();

  while (current) {
    if (guard.has(current)) break;
    guard.add(current);
    const node = byId.get(current);
    if (!node) break;
    chain.unshift(node);
    current = node.parentId ?? null;
  }

  for (const node of chain) {
    trail.push({ id: node.id, label: node.label });
  }
  return trail;
}

export function getViewportForParent(
  diagram: Diagram,
  activeParentId: string | null,
): Viewport {
  const key = parentKey(activeParentId);
  return (
    diagram.viewportsByParent?.[key] ??
    diagram.viewport ?? { x: 0, y: 0, zoom: 1 }
  );
}

export function withViewportForParent(
  diagram: Diagram,
  activeParentId: string | null,
  viewport: Viewport,
): Diagram {
  const key = parentKey(activeParentId);
  return {
    ...diagram,
    viewport,
    viewportsByParent: {
      ...(diagram.viewportsByParent ?? {}),
      [key]: viewport,
    },
  };
}

/** Slice for agent context: node + direct children + edges among them. */
export function sliceDiagram(diagram: Diagram, nodeId: string | null) {
  if (nodeId === null) {
    const { nodes, edges } = filterDiagramByParent(diagram, null);
    return {
      focusId: null,
      focus: null,
      nodes,
      edges,
    };
  }

  const focus = diagram.nodes.find((n) => n.id === nodeId) ?? null;
  if (!focus) {
    return { focusId: nodeId, focus: null, nodes: [], edges: [] };
  }

  const children = getChildren(diagram.nodes, nodeId);
  const nodes = [focus, ...children];
  const ids = new Set(nodes.map((n) => n.id));
  const edges = diagram.edges.filter(
    (e) => ids.has(e.source) && ids.has(e.target),
  );

  return { focusId: nodeId, focus, nodes, edges };
}
