import { useCallback, useRef } from "react";
import type { Node, OnNodeDrag } from "@xyflow/react";
import { CANVAS_CONFIG } from "@/lib/constants";
import type { ArchitectureNodeData } from "@/lib/flow-adapters";
import { useDiagramStore } from "@/store/diagram-store";
import type { Diagram } from "@/types/diagram";

export function useDiagramPersist() {
  const diagram = useDiagramStore((s) => s.diagram);
  const markNodeMoved = useDiagramStore((s) => s.markNodeMoved);
  const markLocalWrite = useDiagramStore((s) => s.markLocalWrite);
  const setInteracting = useDiagramStore((s) => s.setInteracting);
  const commitDiagram = useDiagramStore((s) => s.commitDiagram);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diagramRef = useRef(diagram);
  diagramRef.current = diagram;

  const persistDebounced = useCallback(
    (nextDiagram: Diagram) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        void commitDiagram(nextDiagram, { recordHistory: false });
      }, CANVAS_CONFIG.persistDebounceMs);
    },
    [commitDiagram],
  );

  const onNodeDragStart = useCallback(() => {
    setInteracting(true);
    markLocalWrite();
  }, [markLocalWrite, setInteracting]);

  const onNodeDragStop = useCallback<OnNodeDrag<Node<ArchitectureNodeData>>>(
    (_event, _node, nodes) => {
      const current = diagramRef.current;
      if (!current) {
        setInteracting(false);
        return;
      }

      const positionMap = new Map(nodes.map((n) => [n.id, n.position]));
      const updatedNodes = current.nodes.map((diagramNode) => {
        const pos = positionMap.get(diagramNode.id);
        return pos ? { ...diagramNode, position: pos } : diagramNode;
      });

      for (const n of nodes) {
        markNodeMoved(n.id);
      }

      const updated: Diagram = { ...current, nodes: updatedNodes };
      diagramRef.current = updated;

      void commitDiagram(updated).finally(() => {
        setInteracting(false);
      });
    },
    [commitDiagram, markNodeMoved, setInteracting],
  );

  const onViewportChange = useCallback(
    (viewport: Diagram["viewport"]) => {
      const current = diagramRef.current;
      if (!current) return;

      const updated: Diagram = { ...current, viewport };
      persistDebounced(updated);
    },
    [persistDebounced],
  );

  const saveNow = useCallback(
    async (nextDiagram?: Diagram) => {
      const toSave = nextDiagram ?? diagramRef.current;
      if (!toSave) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return commitDiagram(toSave);
    },
    [commitDiagram],
  );

  return { onNodeDragStart, onNodeDragStop, onViewportChange, saveNow, persistDebounced };
}
