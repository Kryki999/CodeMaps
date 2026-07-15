import dagre from "@dagrejs/dagre";
import { NODE_DIMENSIONS } from "./constants";
import type { Diagram, DiagramNode, Position } from "@/types/diagram";

export function layoutDiagram(diagram: Diagram): Diagram {
  const nodesNeedingLayout = diagram.nodes.filter((n) => !n.position);
  if (nodesNeedingLayout.length === 0) return diagram;

  return relayoutDiagram(diagram);
}

/** Re-layout all nodes using Dagre, ignoring existing positions. */
export function relayoutDiagram(
  diagram: Diagram,
  rankdir: "TB" | "LR" = "TB",
): Diagram {
  if (diagram.nodes.length === 0) return diagram;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir,
    nodesep: 100,
    ranksep: 120,
    marginx: 48,
    marginy: 48,
  });

  for (const node of diagram.nodes) {
    g.setNode(node.id, {
      width: NODE_DIMENSIONS.width,
      height: NODE_DIMENSIONS.height,
    });
  }

  for (const edge of diagram.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positionedNodes: DiagramNode[] = diagram.nodes.map((node) => {
    const layoutNode = g.node(node.id);
    if (!layoutNode) {
      return { ...node, position: { x: 0, y: 0 } };
    }

    const position: Position = {
      x: Math.round((layoutNode.x - NODE_DIMENSIONS.width / 2) / 16) * 16,
      y: Math.round((layoutNode.y - NODE_DIMENSIONS.height / 2) / 16) * 16,
    };

    return { ...node, position };
  });

  return { ...diagram, nodes: positionedNodes };
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

  return layoutDiagram({ ...diagram, nodes: nodesWithPositions });
}
