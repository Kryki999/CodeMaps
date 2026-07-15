import { useCallback, useEffect, useRef } from "react";
import { layoutNewNodes } from "@/lib/auto-layout";
import { mergeDiagram, diagramToPositionMap } from "@/lib/diagram-merge";
import { CANVAS_CONFIG } from "@/lib/constants";
import { useDiagramStore } from "@/store/diagram-store";
import type { Diagram } from "@/types/diagram";

async function fetchDiagram(): Promise<Diagram> {
  const res = await fetch("/api/diagram");
  if (!res.ok) throw new Error("Failed to load diagram");
  return res.json() as Promise<Diagram>;
}

export function useDiagramSync() {
  const setDiagram = useDiagramStore((s) => s.setDiagram);
  const setLoading = useDiagramStore((s) => s.setLoading);
  const setError = useDiagramStore((s) => s.setError);
  const setConnected = useDiagramStore((s) => s.setConnected);
  const shouldIgnoreRemoteUpdate = useDiagramStore((s) => s.shouldIgnoreRemoteUpdate);
  const userMovedNodeIds = useDiagramStore((s) => s.userMovedNodeIds);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const diagramRef = useRef<Diagram | null>(null);

  const applyIncoming = useCallback(
    (incoming: Diagram) => {
      if (shouldIgnoreRemoteUpdate()) return;

      const current = diagramRef.current;
      const merged = mergeDiagram(incoming, current, userMovedNodeIds);
      const positioned = layoutNewNodes(merged, diagramToPositionMap(current ?? merged));
      diagramRef.current = positioned;
      setDiagram(positioned);
    },
    [setDiagram, shouldIgnoreRemoteUpdate, userMovedNodeIds],
  );

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/diagram/watch");
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      reconnectAttemptRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Diagram;
        applyIncoming(data);
      } catch {
        setError("Failed to parse diagram update");
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;

      const delay = Math.min(
        CANVAS_CONFIG.sseReconnectBaseMs * 2 ** reconnectAttemptRef.current,
        CANVAS_CONFIG.sseReconnectMaxMs,
      );
      reconnectAttemptRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
    };
  }, [applyIncoming, setConnected, setError]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const diagram = await fetchDiagram();
        if (cancelled) return;
        const positioned = layoutNewNodes(diagram, new Map());
        diagramRef.current = positioned;
        setDiagram(positioned);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load diagram");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    connectSSE();

    return () => {
      cancelled = true;
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectSSE, setDiagram, setError, setLoading]);

  useEffect(() => {
    const unsubscribe = useDiagramStore.subscribe((state) => {
      diagramRef.current = state.diagram;
    });
    return unsubscribe;
  }, []);
}
