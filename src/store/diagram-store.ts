import { create } from "zustand";
import { CANVAS_CONFIG } from "@/lib/constants";
import { saveDiagramToApi } from "@/lib/diagram-api";
import { cloneDiagram, MAX_HISTORY_SIZE } from "@/lib/diagram-history";
import { getViewportForParent, withViewportForParent } from "@/lib/hierarchy";
import type { Diagram, Viewport } from "@/types/diagram";

interface DiagramStore {
  diagram: Diagram | null;
  isLoading: boolean;
  error: string | null;
  userMovedNodeIds: Set<string>;
  lastLocalWriteAt: number;
  isConnected: boolean;
  isInteracting: boolean;
  editingNodeId: string | null;
  editingEdgeId: string | null;
  /** null = root C4 level */
  activeParentId: string | null;
  historyPast: Diagram[];
  historyFuture: Diagram[];
  isApplyingHistory: boolean;

  setDiagram: (diagram: Diagram) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;
  setInteracting: (interacting: boolean) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setEditingEdgeId: (edgeId: string | null) => void;
  setActiveParentId: (parentId: string | null) => void;
  drillInto: (nodeId: string) => void;
  navigateToParent: (parentId: string | null) => void;
  markNodeMoved: (nodeId: string) => void;
  markAllNodesMoved: (nodeIds: string[]) => void;
  clearUserMovedNodes: () => void;
  markLocalWrite: () => void;
  shouldIgnoreRemoteUpdate: () => boolean;
  pushHistory: () => void;
  commitDiagram: (
    next: Diagram,
    options?: { recordHistory?: boolean; persist?: boolean },
  ) => Promise<Diagram | null>;
  undo: () => Promise<Diagram | null>;
  redo: () => Promise<Diagram | null>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  updateViewport: (viewport: Viewport) => void;
  updateMetadataName: (name: string) => void;
}

function persistLevelViewport(
  diagram: Diagram,
  activeParentId: string | null,
  viewport: Viewport,
): Diagram {
  return withViewportForParent(diagram, activeParentId, viewport);
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  diagram: null,
  isLoading: true,
  error: null,
  userMovedNodeIds: new Set(),
  lastLocalWriteAt: 0,
  isConnected: false,
  isInteracting: false,
  editingNodeId: null,
  editingEdgeId: null,
  activeParentId: null,
  historyPast: [],
  historyFuture: [],
  isApplyingHistory: false,

  setDiagram: (diagram) => set({ diagram, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setConnected: (isConnected) => set({ isConnected }),
  setInteracting: (isInteracting) => set({ isInteracting }),
  setEditingNodeId: (editingNodeId) => set({ editingNodeId }),
  setEditingEdgeId: (editingEdgeId) => set({ editingEdgeId }),

  setActiveParentId: (activeParentId) => set({ activeParentId }),

  drillInto: (nodeId) => {
    const { diagram, activeParentId, setEditingNodeId, setInteracting } = get();
    if (!diagram) return;

    const currentViewport = diagram.viewport;
    const saved = persistLevelViewport(diagram, activeParentId, currentViewport);
    const nextViewport = getViewportForParent(saved, nodeId);

    set({
      diagram: { ...saved, viewport: nextViewport },
      activeParentId: nodeId,
      editingNodeId: null,
      editingEdgeId: null,
    });
    setEditingNodeId(null);
    setInteracting(false);
  },

  navigateToParent: (parentId) => {
    const { diagram, activeParentId, setEditingNodeId, setInteracting } = get();
    if (!diagram) return;

    const currentViewport = diagram.viewport;
    const saved = persistLevelViewport(diagram, activeParentId, currentViewport);
    const nextViewport = getViewportForParent(saved, parentId);

    set({
      diagram: { ...saved, viewport: nextViewport },
      activeParentId: parentId,
      editingNodeId: null,
      editingEdgeId: null,
    });
    setEditingNodeId(null);
    setInteracting(false);
  },

  markNodeMoved: (nodeId) =>
    set((state) => {
      const userMovedNodeIds = new Set(state.userMovedNodeIds);
      userMovedNodeIds.add(nodeId);
      return { userMovedNodeIds };
    }),

  markAllNodesMoved: (nodeIds) =>
    set({ userMovedNodeIds: new Set(nodeIds) }),

  clearUserMovedNodes: () => set({ userMovedNodeIds: new Set() }),

  markLocalWrite: () => set({ lastLocalWriteAt: Date.now() }),

  shouldIgnoreRemoteUpdate: () => {
    const { lastLocalWriteAt, isInteracting, editingNodeId, editingEdgeId, isApplyingHistory } =
      get();
    if (isInteracting || editingNodeId || editingEdgeId || isApplyingHistory) return true;
    return Date.now() - lastLocalWriteAt < CANVAS_CONFIG.localWriteIgnoreMs;
  },

  pushHistory: () => {
    const { diagram, historyPast } = get();
    if (!diagram) return;
    const snapshot = cloneDiagram(diagram);
    const nextPast = [...historyPast, snapshot].slice(-MAX_HISTORY_SIZE);
    set({ historyPast: nextPast, historyFuture: [] });
  },

  commitDiagram: async (next, options = {}) => {
    const { recordHistory = true, persist = true } = options;
    const { diagram, activeParentId } = get();

    if (recordHistory && diagram && !get().isApplyingHistory) {
      get().pushHistory();
    }

    const withVp = persistLevelViewport(next, activeParentId, next.viewport);
    const withTimestamp: Diagram = {
      ...withVp,
      metadata: { ...withVp.metadata, updatedAt: new Date().toISOString() },
    };

    set({ diagram: withTimestamp, error: null });
    get().markLocalWrite();

    if (!persist) return withTimestamp;

    try {
      const saved = await saveDiagramToApi(withTimestamp);
      set({ diagram: saved });
      get().markLocalWrite();
      return saved;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Nie udało się zapisać diagramu",
      });
      return null;
    }
  },

  undo: async () => {
    const { historyPast, diagram, historyFuture } = get();
    if (historyPast.length === 0 || !diagram) return null;

    const previous = historyPast[historyPast.length - 1];
    const current = cloneDiagram(diagram);

    set({
      isApplyingHistory: true,
      historyPast: historyPast.slice(0, -1),
      historyFuture: [current, ...historyFuture].slice(0, MAX_HISTORY_SIZE),
      diagram: previous,
      editingNodeId: null,
      editingEdgeId: null,
    });

    get().markLocalWrite();
    try {
      const saved = await saveDiagramToApi(previous);
      set({ diagram: saved });
      get().markLocalWrite();
      return saved;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Cofanie nie powiodło się" });
      return null;
    } finally {
      set({ isApplyingHistory: false });
    }
  },

  redo: async () => {
    const { historyFuture, diagram, historyPast } = get();
    if (historyFuture.length === 0 || !diagram) return null;

    const next = historyFuture[0];
    const current = cloneDiagram(diagram);

    set({
      isApplyingHistory: true,
      historyFuture: historyFuture.slice(1),
      historyPast: [...historyPast, current].slice(-MAX_HISTORY_SIZE),
      diagram: next,
      editingNodeId: null,
      editingEdgeId: null,
    });

    get().markLocalWrite();
    try {
      const saved = await saveDiagramToApi(next);
      set({ diagram: saved });
      get().markLocalWrite();
      return saved;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Ponowienie nie powiodło się" });
      return null;
    } finally {
      set({ isApplyingHistory: false });
    }
  },

  canUndo: () => get().historyPast.length > 0,
  canRedo: () => get().historyFuture.length > 0,
  clearHistory: () => set({ historyPast: [], historyFuture: [] }),

  updateViewport: (viewport) =>
    set((state) => {
      if (!state.diagram) return state;
      return {
        diagram: persistLevelViewport(state.diagram, state.activeParentId, viewport),
      };
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
