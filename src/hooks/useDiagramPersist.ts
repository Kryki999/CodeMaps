import { useCallback, useRef } from "react";
import type { Node, OnNodeDrag } from "@xyflow/react";
import { CANVAS_CONFIG } from "@/lib/constants";
import type { ArchitectureNodeData } from "@/lib/flow-adapters";
import { useDiagramStore } from "@/store/diagram-store";
import type { Diagram } from "@/types/diagram";

async function saveDiagram(diagram: Diagram): Promise<void> {
  const res = await fetch("/api/diagram", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(diagram),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to save diagram");
  }
}

export function useDiagramPersist() {
  const diagram = useDiagramStore((s) => s.diagram);
  const setDiagram = useDiagramStore((s) => s.setDiagram);
  const markNodeMoved = useDiagramStore((s) => s.markNodeMoved);
  const markLocalWrite = useDiagramStore((s) => s.markLocalWrite);
  const setError = useDiagramStore((s) => s.setError);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diagramRef = useRef(diagram);
  diagramRef.current = diagram;

  const persist = useCallback(
    (nextDiagram: Diagram) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        markLocalWrite();
        void saveDiagram(nextDiagram).catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to save");
        });
      }, CANVAS_CONFIG.persistDebounceMs);
    },
    [markLocalWrite, setError],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<Node<ArchitectureNodeData>>>(
    (_event, _node, nodes) => {
      const current = diagramRef.current;
      if (!current) return;

      const positionMap = new Map(nodes.map((n) => [n.id, n.position]));
      const updatedNodes = current.nodes.map((node) => {
        const pos = positionMap.get(node.id);
        return pos ? { ...node, position: pos } : node;
      });

      for (const n of nodes) {
        markNodeMoved(n.id);
      }

      const updated: Diagram = { ...current, nodes: updatedNodes };
      setDiagram(updated);
      persist(updated);
    },
    [markNodeMoved, persist, setDiagram],
  );

  const onViewportChange = useCallback(
    (viewport: Diagram["viewport"]) => {
      const current = diagramRef.current;
      if (!current) return;

      const updated: Diagram = { ...current, viewport };
      setDiagram(updated);
      persist(updated);
    },
    [persist, setDiagram],
  );

  const saveNow = useCallback(
    async (nextDiagram?: Diagram) => {
      const toSave = nextDiagram ?? diagramRef.current;
      if (!toSave) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      markLocalWrite();
      await saveDiagram(toSave);
      setDiagram(toSave);
    },
    [markLocalWrite, setDiagram],
  );

  return { onNodeDragStop, onViewportChange, saveNow, persist };
}
