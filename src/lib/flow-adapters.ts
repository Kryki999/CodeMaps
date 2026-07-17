import type { DiagramNode, NodeHealth, NodeStatus, NodeType } from "@/types/diagram";
import type { Node } from "@xyflow/react";

export interface ArchitectureNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  tech?: string[];
  purpose?: string;
  rationale?: string;
  description?: string;
  status?: NodeStatus;
  health?: NodeHealth;
  codeRef?: string | null;
  exports?: string[];
  deps?: string[];
  depthHint?: 1 | 2 | 3;
  parentId?: string | null;
  childrenCount?: number;
  externalEdgeCount?: number;
}

export function diagramNodeToFlowNode(
  node: DiagramNode,
  extras?: { childrenCount?: number; externalEdgeCount?: number },
): Node<ArchitectureNodeData> {
  return {
    id: node.id,
    type: node.type,
    position: node.position ?? { x: 0, y: 0 },
    data: {
      label: node.label,
      nodeType: node.type,
      tech: node.data?.tech,
      purpose: node.data?.purpose,
      rationale: node.data?.rationale,
      description: node.data?.description,
      status: node.data?.status ?? "planned",
      health: node.data?.health ?? "stable",
      codeRef: node.data?.codeRef ?? null,
      exports: node.data?.exports,
      deps: node.data?.deps,
      depthHint: node.data?.depthHint,
      parentId: node.parentId ?? null,
      childrenCount: extras?.childrenCount ?? 0,
      externalEdgeCount: extras?.externalEdgeCount ?? 0,
    },
  };
}

export function flowNodesToDiagramNodes(
  flowNodes: Node<ArchitectureNodeData>[],
  originalNodes: DiagramNode[],
): DiagramNode[] {
  const originalById = new Map(originalNodes.map((n) => [n.id, n]));
  const flowIds = new Set(flowNodes.map((n) => n.id));

  const updatedFromFlow = flowNodes.map((flowNode) => {
    const original = originalById.get(flowNode.id);
    return {
      id: flowNode.id,
      type: flowNode.data.nodeType,
      label: flowNode.data.label,
      parentId: flowNode.data.parentId ?? original?.parentId ?? null,
      position: flowNode.position,
      data: {
        tech: flowNode.data.tech,
        purpose: flowNode.data.purpose,
        rationale: flowNode.data.rationale,
        description: flowNode.data.description,
        status: flowNode.data.status,
        health: flowNode.data.health,
        codeRef: flowNode.data.codeRef,
        exports: flowNode.data.exports,
        deps: flowNode.data.deps,
        depthHint: flowNode.data.depthHint,
      },
    } satisfies DiagramNode;
  });

  // Preserve nodes not on the current canvas level
  const preserved = originalNodes.filter((n) => !flowIds.has(n.id));
  return [...preserved, ...updatedFromFlow];
}
