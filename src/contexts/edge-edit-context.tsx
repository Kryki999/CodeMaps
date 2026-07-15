"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { EDGE_TYPES } from "@/lib/constants";
import { diagramEdgeToFlowEdge } from "@/lib/flow-edge-adapters";
import { useDiagramStore } from "@/store/diagram-store";
import type { DiagramEdge, EdgeType } from "@/types/diagram";
import type { Edge } from "@xyflow/react";
import type { ArchitectureEdgeData } from "@/lib/flow-edge-adapters";

export type LineStyle = "solid" | "dashed" | "animated";

export interface EdgeEditValues {
  label: string;
  edgeType: EdgeType;
  lineStyle: LineStyle;
}

interface EdgeEditContextValue {
  editingEdgeId: string | null;
  startEditing: (edgeId: string) => void;
  cancelEditing: () => void;
  saveEdgeEdit: (edgeId: string, values: EdgeEditValues) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
}

const EdgeEditContext = createContext<EdgeEditContextValue | null>(null);

function lineStyleToFlags(style: LineStyle): { animated: boolean; dashed: boolean } {
  switch (style) {
    case "dashed":
      return { animated: false, dashed: true };
    case "animated":
      return { animated: true, dashed: false };
    default:
      return { animated: false, dashed: false };
  }
}

function flagsToLineStyle(edge: DiagramEdge): LineStyle {
  if (edge.animated) return "animated";
  if (edge.dashed) return "dashed";
  return "solid";
}

interface EdgeEditProviderProps {
  children: ReactNode;
  onEdgesUpdate: (edges: Edge<ArchitectureEdgeData>[]) => void;
  onSyncRevisionBump: () => void;
}

export function EdgeEditProvider({
  children,
  onEdgesUpdate,
  onSyncRevisionBump,
}: EdgeEditProviderProps) {
  const editingEdgeId = useDiagramStore((s) => s.editingEdgeId);
  const setEditingEdgeId = useDiagramStore((s) => s.setEditingEdgeId);
  const setInteracting = useDiagramStore((s) => s.setInteracting);
  const markLocalWrite = useDiagramStore((s) => s.markLocalWrite);
  const commitDiagram = useDiagramStore((s) => s.commitDiagram);
  const setError = useDiagramStore((s) => s.setError);

  const startEditing = useCallback(
    (edgeId: string) => {
      setEditingEdgeId(edgeId);
      setInteracting(true);
      markLocalWrite();
    },
    [markLocalWrite, setEditingEdgeId, setInteracting],
  );

  const cancelEditing = useCallback(() => {
    setEditingEdgeId(null);
    setInteracting(false);
  }, [setEditingEdgeId, setInteracting]);

  const saveEdgeEdit = useCallback(
    async (edgeId: string, values: EdgeEditValues) => {
      const current = useDiagramStore.getState().diagram;
      if (!current) {
        cancelEditing();
        return;
      }

      if (!EDGE_TYPES.includes(values.edgeType)) {
        setError("Nieprawidłowy typ połączenia");
        return;
      }

      const { animated, dashed } = lineStyleToFlags(values.lineStyle);
      const updatedEdges = current.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              label: values.label.trim() || undefined,
              type: values.edgeType,
              animated,
              dashed,
            }
          : edge,
      );

      const updated = { ...current, edges: updatedEdges };
      onEdgesUpdate(updatedEdges.map((e) => diagramEdgeToFlowEdge(e)));

      try {
        const saved = await commitDiagram(updated);
        if (saved) {
          onEdgesUpdate(saved.edges.map((e) => diagramEdgeToFlowEdge(e)));
          onSyncRevisionBump();
        }
      } catch {
        setError("Nie udało się zapisać połączenia");
      } finally {
        setEditingEdgeId(null);
        setInteracting(false);
      }
    },
    [
      cancelEditing,
      commitDiagram,
      onEdgesUpdate,
      onSyncRevisionBump,
      setEditingEdgeId,
      setError,
      setInteracting,
    ],
  );

  const deleteEdge = useCallback(
    async (edgeId: string) => {
      const current = useDiagramStore.getState().diagram;
      if (!current) return;

      const updated = {
        ...current,
        edges: current.edges.filter((e) => e.id !== edgeId),
      };
      onEdgesUpdate(updated.edges.map((e) => diagramEdgeToFlowEdge(e)));

      try {
        const saved = await commitDiagram(updated);
        if (saved) {
          onEdgesUpdate(saved.edges.map((e) => diagramEdgeToFlowEdge(e)));
          onSyncRevisionBump();
        }
      } finally {
        setEditingEdgeId(null);
        setInteracting(false);
      }
    },
    [commitDiagram, onEdgesUpdate, onSyncRevisionBump, setEditingEdgeId, setInteracting],
  );

  const value = useMemo(
    () => ({ editingEdgeId, startEditing, cancelEditing, saveEdgeEdit, deleteEdge }),
    [editingEdgeId, startEditing, cancelEditing, saveEdgeEdit, deleteEdge],
  );

  return <EdgeEditContext.Provider value={value}>{children}</EdgeEditContext.Provider>;
}

export function useEdgeEdit() {
  const ctx = useContext(EdgeEditContext);
  if (!ctx) throw new Error("useEdgeEdit must be used within EdgeEditProvider");
  return ctx;
}

export { flagsToLineStyle };
