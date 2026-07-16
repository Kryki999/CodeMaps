import dagre from "@dagrejs/dagre";
import { NODE_DIMENSIONS } from "./constants";
import { filterDiagramByParent } from "./hierarchy";
import type { Diagram, DiagramNode, Position } from "@/types/diagram";

export function layoutDiagram(
  diagram: Diagram,
  activeParentId: string | null = null,
): Diagram {
  const { nodes: levelNodes } = filterDiagramByParent(diagram, activeParentId);
  const needsLayout = levelNodes.some((n) => !n.position);
  if (!needsLayout) return diagram;

  return relayoutDiagram(diagram, "TB", activeParentId);
}

/**
 * Re-layout nodes at a given parent level using Dagre.
 * Nodes on other levels keep their positions.
 */
export function relayoutDiagram(
  diagram: Diagram,
  rankdir: "TB" | "LR" = "TB",
  activeParentId: string | null = null,
): Diagram {
  const { nodes: levelNodes, edges: levelEdges } = filterDiagramByParent(
    diagram,
    activeParentId,
  );
  if (levelNodes.length === 0) return diagram;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir,
    nodesep: 100,
    ranksep: 120,
    marginx: 48,
    marginy: 48,
  });

  for (const node of levelNodes) {
    g.setNode(node.id, {
      width: NODE_DIMENSIONS.width,
      height: NODE_DIMENSIONS.height,
    });
  }

  for (const edge of levelEdges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions = new Map<string, Position>();
  for (const node of levelNodes) {
    const layoutNode = g.node(node.id);
    if (!layoutNode) {
      positions.set(node.id, { x: 0, y: 0 });
      continue;
    }
    positions.set(node.id, {
      x: Math.round((layoutNode.x - NODE_DIMENSIONS.width / 2) / 16) * 16,
      y: Math.round((layoutNode.y - NODE_DIMENSIONS.height / 2) / 16) * 16,
    });
  }

  const positionedNodes: DiagramNode[] = diagram.nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });

  return { ...diagram, nodes: positionedNodes };
}

/**
 * Layout only nodes missing positions, grouping by parent level.
 */
export function layoutMissingPositions(diagram: Diagram): Diagram {
  const parents = new Set<string | null>();
  for (const node of diagram.nodes) {
    if (!node.position) {
      parents.add(node.parentId ?? null);
    }
  }

  let next = diagram;
  for (const parentId of parents) {
    next = layoutDiagram(next, parentId);
  }
  return next;
}

export function layoutNewNodes(
  diagram: Diagram,
  existingPositions: Map<string, Position>,
): Diagram {
  const nodesWithPositions = diagram.nodes.map((node) => {
    if (node.position) return node;
    const existing = existingPositions.get(node.id);
    return existing ? { ...node, position: existing } : node;
  });

  return layoutMissingPositions({ ...diagram, nodes: nodesWithPositions });
}
