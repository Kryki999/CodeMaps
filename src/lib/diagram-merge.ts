import type { Diagram, DiagramNode, Position } from "@/types/diagram";

export function mergeDiagram(
  incoming: Diagram,
  current: Diagram | null,
  userMovedNodeIds: Set<string>,
): Diagram {
  if (!current) return incoming;

  const currentNodesById = new Map(current.nodes.map((n) => [n.id, n]));
  const mergedNodes: DiagramNode[] = incoming.nodes.map((incomingNode) => {
    const localNode = currentNodesById.get(incomingNode.id);

    if (localNode && userMovedNodeIds.has(incomingNode.id) && localNode.position) {
      return {
        ...incomingNode,
        position: localNode.position,
      };
    }

    if (incomingNode.position) {
      return incomingNode;
    }

    if (localNode?.position) {
      return { ...incomingNode, position: localNode.position };
    }

    return incomingNode;
  });

  return {
    ...incoming,
    viewport: current.viewport,
    nodes: mergedNodes,
    edges: incoming.edges,
  };
}

export function applyNodePositions(
  diagram: Diagram,
  positions: Map<string, Position>,
): Diagram {
  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => {
      const position = positions.get(node.id);
      return position ? { ...node, position } : node;
    }),
  };
}

export function diagramToPositionMap(diagram: Diagram): Map<string, Position> {
  return new Map(
    diagram.nodes
      .filter((n) => n.position)
      .map((n) => [n.id, n.position!]),
  );
}
