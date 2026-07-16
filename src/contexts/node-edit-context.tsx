"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { diagramNodeToFlowNode } from "@/lib/flow-adapters";
import {
  countChildren,
  countExternalConnections,
  filterDiagramByParent,
} from "@/lib/hierarchy";
import { useDiagramStore } from "@/store/diagram-store";
import type { Diagram, NodeHealth, NodeStatus } from "@/types/diagram";
import type { Node } from "@xyflow/react";
import type { ArchitectureNodeData } from "@/lib/flow-adapters";

export interface NodeEditValues {
  label: string;
  purpose: string;
  description: string;
  tech: string;
  status: NodeStatus;
  health: NodeHealth;
  deps: string;
  exports: string;
  codeRef: string;
}

interface NodeEditContextValue {
  editingNodeId: string | null;
  startEditing: (nodeId: string) => void;
  cancelEditing: () => void;
  saveNodeEdit: (nodeId: string, values: NodeEditValues) => Promise<void>;
  enterNode: (nodeId: string) => void;
}

const NodeEditContext = createContext<NodeEditContextValue | null>(null);

function splitList(value: string): string[] | undefined {
  const list = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function mapVisibleFlowNodes(diagram: Diagram, activeParentId: string | null) {
  const { nodes } = filterDiagramByParent(diagram, activeParentId);
  return nodes.map((n) =>
    diagramNodeToFlowNode(n, {
      childrenCount: countChildren(diagram.nodes, n.id),
      externalEdgeCount: countExternalConnections(diagram, n.id, activeParentId),
    }),
  );
}

interface NodeEditProviderProps {
  children: ReactNode;
  onNodesUpdate: (nodes: Node<ArchitectureNodeData>[]) => void;
  onSyncRevisionBump: () => void;
}

export function NodeEditProvider({
  children,
  onNodesUpdate,
  onSyncRevisionBump,
}: NodeEditProviderProps) {
  const editingNodeId = useDiagramStore((s) => s.editingNodeId);
  const setEditingNodeId = useDiagramStore((s) => s.setEditingNodeId);
  const setInteracting = useDiagramStore((s) => s.setInteracting);
  const markLocalWrite = useDiagramStore((s) => s.markLocalWrite);
  const commitDiagram = useDiagramStore((s) => s.commitDiagram);
  const setError = useDiagramStore((s) => s.setError);
  const drillInto = useDiagramStore((s) => s.drillInto);

  const startEditing = useCallback(
    (nodeId: string) => {
      setEditingNodeId(nodeId);
      setInteracting(true);
      markLocalWrite();
    },
    [markLocalWrite, setEditingNodeId, setInteracting],
  );

  const cancelEditing = useCallback(() => {
    setEditingNodeId(null);
    setInteracting(false);
  }, [setEditingNodeId, setInteracting]);

  const enterNode = useCallback(
    (nodeId: string) => {
      setEditingNodeId(null);
      setInteracting(false);
      drillInto(nodeId);
    },
    [drillInto, setEditingNodeId, setInteracting],
  );

  const saveNodeEdit = useCallback(
    async (nodeId: string, values: NodeEditValues) => {
      const current = useDiagramStore.getState().diagram;
      const activeParentId = useDiagramStore.getState().activeParentId;
      if (!current) {
        cancelEditing();
        return;
      }

      const trimmedLabel = values.label.trim();
      if (!trimmedLabel) {
        setError("Nazwa komponentu nie może być pusta");
        return;
      }

      const updatedNodes = current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              label: trimmedLabel,
              data: {
                ...node.data,
                purpose: values.purpose.trim() || undefined,
                description: values.description.trim() || undefined,
                tech: splitList(values.tech),
                status: values.status,
                health: values.health,
                deps: splitList(values.deps),
                exports: splitList(values.exports),
                codeRef: values.codeRef.trim() || null,
              },
            }
          : node,
      );

      const updated: Diagram = { ...current, nodes: updatedNodes };
      onNodesUpdate(mapVisibleFlowNodes(updated, activeParentId));

      try {
        const saved = await commitDiagram(updated);
        if (saved) {
          onNodesUpdate(mapVisibleFlowNodes(saved, activeParentId));
          onSyncRevisionBump();
        }
      } catch {
        setError("Nie udało się zapisać zmian");
      } finally {
        setEditingNodeId(null);
        setInteracting(false);
      }
    },
    [
      cancelEditing,
      commitDiagram,
      onNodesUpdate,
      onSyncRevisionBump,
      setEditingNodeId,
      setError,
      setInteracting,
    ],
  );

  const value = useMemo(
    () => ({
      editingNodeId,
      startEditing,
      cancelEditing,
      saveNodeEdit,
      enterNode,
    }),
    [editingNodeId, startEditing, cancelEditing, saveNodeEdit, enterNode],
  );

  return <NodeEditContext.Provider value={value}>{children}</NodeEditContext.Provider>;
}

export function useNodeEdit() {
  const ctx = useContext(NodeEditContext);
  if (!ctx) throw new Error("useNodeEdit must be used within NodeEditProvider");
  return ctx;
}
