"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { edgeTypes } from "./edges/LabeledEdge";
import { nodeTypes } from "./nodes";
import { CanvasControls } from "./CanvasControls";
import { CANVAS_CONFIG } from "@/lib/constants";
import { diagramNodeToFlowNode } from "@/lib/flow-adapters";
import { useDiagramPersist } from "@/hooks/useDiagramPersist";
import { useDiagramStore } from "@/store/diagram-store";
import type { DiagramEdge } from "@/types/diagram";

function diagramEdgeToFlowEdge(edge: DiagramEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type ?? "default",
    label: edge.label,
    animated: edge.animated ?? false,
  };
}

function CanvasInner() {
  const diagram = useDiagramStore((s) => s.diagram);
  const { onNodeDragStop, onViewportChange } = useDiagramPersist();
  const { setViewport, fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useState(true);
  const initialViewportSet = useRef(false);

  const nodes = useMemo(
    () => (diagram?.nodes ?? []).map((n) => diagramNodeToFlowNode(n)),
    [diagram?.nodes],
  );

  const edges: Edge[] = useMemo(
    () => (diagram?.edges ?? []).map(diagramEdgeToFlowEdge),
    [diagram?.edges],
  );

  useEffect(() => {
    if (!diagram || initialViewportSet.current) return;
    const { x, y, zoom } = diagram.viewport;
    setViewport({ x, y, zoom }, { duration: 0 });
    initialViewportSet.current = true;
  }, [diagram, setViewport]);

  const hasFitted = useRef(false);
  useEffect(() => {
    if (diagram && diagram.nodes.length > 0 && !hasFitted.current) {
      hasFitted.current = true;
      const timer = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
      return () => clearTimeout(timer);
    }
  }, [diagram, fitView]);

  const handleMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      onViewportChange({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
    },
    [onViewportChange],
  );

  if (!diagram) return null;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={handleMoveEnd}
        minZoom={CANVAS_CONFIG.minZoom}
        maxZoom={CANVAS_CONFIG.maxZoom}
        snapToGrid
        snapGrid={CANVAS_CONFIG.snapGrid}
        panOnDrag={[1, 2]}
        selectionOnDrag
        onlyRenderVisibleElements
        fitView
        className="bg-[#1a1a2e]"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#2a2a4a" />
        {showMinimap && (
          <MiniMap
            nodeColor="#16213e"
            maskColor="rgba(26, 26, 46, 0.7)"
            className="!bg-[#12122a] !border !border-slate-700"
          />
        )}
      </ReactFlow>
      <CanvasControls showMinimap={showMinimap} onToggleMinimap={() => setShowMinimap((v) => !v)} />
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
