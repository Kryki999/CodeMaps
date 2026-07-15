import { create } from "zustand";
import type { Diagram } from "@/types/diagram";

interface DiagramStore {
  diagram: Diagram | null;
  isLoading: boolean;
  error: string | null;
  userMovedNodeIds: Set<string>;
  lastLocalWriteAt: number;
  isConnected: boolean;

  setDiagram: (diagram: Diagram) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;
  markNodeMoved: (nodeId: string) => void;
  clearUserMovedNodes: () => void;
  markLocalWrite: () => void;
  shouldIgnoreRemoteUpdate: () => boolean;
  updateViewport: (viewport: Diagram["viewport"]) => void;
  updateMetadataName: (name: string) => void;
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  diagram: null,
  isLoading: true,
  error: null,
  userMovedNodeIds: new Set(),
  lastLocalWriteAt: 0,
  isConnected: false,

  setDiagram: (diagram) => set({ diagram, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setConnected: (isConnected) => set({ isConnected }),

  markNodeMoved: (nodeId) =>
    set((state) => {
      const userMovedNodeIds = new Set(state.userMovedNodeIds);
      userMovedNodeIds.add(nodeId);
      return { userMovedNodeIds };
    }),

  clearUserMovedNodes: () => set({ userMovedNodeIds: new Set() }),

  markLocalWrite: () => set({ lastLocalWriteAt: Date.now() }),

  shouldIgnoreRemoteUpdate: () => {
    const { lastLocalWriteAt } = get();
    return Date.now() - lastLocalWriteAt < 500;
  },

  updateViewport: (viewport) =>
    set((state) => {
      if (!state.diagram) return state;
      return { diagram: { ...state.diagram, viewport } };
    }),

  updateMetadataName: (name) =>
    set((state) => {
      if (!state.diagram) return state;
      return {
        diagram: {
          ...state.diagram,
          metadata: { ...state.diagram.metadata, name },
        },
      };
    }),
}));
