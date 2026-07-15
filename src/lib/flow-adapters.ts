import type { DiagramNode, NodeType } from "@/types/diagram";
import type { Node } from "@xyflow/react";

export interface ArchitectureNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  tech?: string[];
  description?: string;
  status?: "planned" | "existing" | "deprecated";
  codeRef?: string | null;
}

export function diagramNodeToFlowNode(node: DiagramNode): Node<ArchitectureNodeData> {
  return {
    id: node.id,
    type: node.type,
    position: node.position ?? { x: 0, y: 0 },
    data: {
      label: node.label,
      nodeType: node.type,
      tech: node.data?.tech,
      description: node.data?.description,
      status: node.data?.status ?? "planned",
      codeRef: node.data?.codeRef ?? null,
    },
  };
}

export function flowNodesToDiagramNodes(
  flowNodes: Node<ArchitectureNodeData>[],
  originalNodes: DiagramNode[],
): DiagramNode[] {
  const originalById = new Map(originalNodes.map((n) => [n.id, n]));

  return flowNodes.map((flowNode) => {
    const original = originalById.get(flowNode.id);
    return {
      id: flowNode.id,
      type: flowNode.data.nodeType,
      label: flowNode.data.label,
      position: flowNode.position,
      data: {
        tech: flowNode.data.tech,
        description: flowNode.data.description,
        status: flowNode.data.status,
        codeRef: flowNode.data.codeRef,
      },
      ...(original ? {} : {}),
    };
  });
}
