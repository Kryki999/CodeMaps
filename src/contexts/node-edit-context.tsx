"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { diagramNodeToFlowNode } from "@/lib/flow-adapters";
import { useDiagramStore } from "@/store/diagram-store";
import type { Diagram } from "@/types/diagram";
import type { Node } from "@xyflow/react";
import type { ArchitectureNodeData } from "@/lib/flow-adapters";

export interface NodeEditValues {
  label: string;
  description: string;
  tech: string;
}

interface NodeEditContextValue {
  editingNodeId: string | null;
  startEditing: (nodeId: string) => void;
  cancelEditing: () => void;
  saveNodeEdit: (nodeId: string, values: NodeEditValues) => Promise<void>;
}

const NodeEditContext = createContext<NodeEditContextValue | null>(null);

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

  const saveNodeEdit = useCallback(
    async (nodeId: string, values: NodeEditValues) => {
      const current = useDiagramStore.getState().diagram;
      if (!current) {
        cancelEditing();
        return;
      }

      const trimmedLabel = values.label.trim();
      if (!trimmedLabel) {
        setError("Nazwa komponentu nie może być pusta");
        return;
      }

      const techList = values.tech
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const updatedNodes = current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              label: trimmedLabel,
              data: {
                ...node.data,
                description: values.description.trim() || undefined,
                tech: techList.length > 0 ? techList : undefined,
              },
            }
          : node,
      );

      const updated: Diagram = { ...current, nodes: updatedNodes };
      onNodesUpdate(updatedNodes.map((n) => diagramNodeToFlowNode(n)));

      try {
        const saved = await commitDiagram(updated);
        if (saved) {
          onNodesUpdate(saved.nodes.map((n) => diagramNodeToFlowNode(n)));
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
    () => ({ editingNodeId, startEditing, cancelEditing, saveNodeEdit }),
    [editingNodeId, startEditing, cancelEditing, saveNodeEdit],
  );

  return <NodeEditContext.Provider value={value}>{children}</NodeEditContext.Provider>;
}

export function useNodeEdit() {
  const ctx = useContext(NodeEditContext);
  if (!ctx) throw new Error("useNodeEdit must be used within NodeEditProvider");
  return ctx;
}
