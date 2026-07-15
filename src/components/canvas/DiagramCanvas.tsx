"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { edgeTypes } from "./edges/LabeledEdge";
import { nodeTypes } from "./nodes";
import { CanvasControls } from "./CanvasControls";
import { CANVAS_CONFIG } from "@/lib/constants";
import { relayoutDiagram } from "@/lib/auto-layout";
import { diagramNodeToFlowNode, type ArchitectureNodeData } from "@/lib/flow-adapters";
import { useDiagramPersist } from "@/hooks/useDiagramPersist";
import { useDiagramStore } from "@/store/diagram-store";
import { NodeEditProvider } from "@/contexts/node-edit-context";
import type { DiagramEdge } from "@/types/diagram";
import type { Node } from "@xyflow/react";

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
  const isInteracting = useDiagramStore((s) => s.isInteracting);
  const editingNodeId = useDiagramStore((s) => s.editingNodeId);
  const clearUserMovedNodes = useDiagramStore((s) => s.clearUserMovedNodes);
  const { onNodeDragStart, onNodeDragStop, onViewportChange, saveNow } = useDiagramPersist();
  const { setViewport, fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useState(true);
  const initialViewportSet = useRef(false);
  const lastSyncedAt = useRef<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ArchitectureNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!diagram || isInteracting) return;
    if (lastSyncedAt.current === diagram.metadata.updatedAt) return;

    lastSyncedAt.current = diagram.metadata.updatedAt;
    setNodes(diagram.nodes.map((n) => diagramNodeToFlowNode(n)));
    setEdges(diagram.edges.map(diagramEdgeToFlowEdge));
  }, [diagram, isInteracting, setNodes, setEdges]);

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

  const handleAutoLayout = useCallback(async () => {
    if (!diagram) return;

    const laidOut = relayoutDiagram(diagram);
    clearUserMovedNodes();
    lastSyncedAt.current = null;
    setNodes(laidOut.nodes.map((n) => diagramNodeToFlowNode(n)));
    await saveNow(laidOut);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [diagram, clearUserMovedNodes, saveNow, setNodes, fitView]);

  const handleNodesUpdate = useCallback(
    (updated: Node<ArchitectureNodeData>[]) => {
      setNodes(updated);
    },
    [setNodes],
  );

  const handleSyncRevisionBump = useCallback(() => {
    lastSyncedAt.current = null;
  }, []);

  if (!diagram) return null;

  return (
    <NodeEditProvider onNodesUpdate={handleNodesUpdate} onSyncRevisionBump={handleSyncRevisionBump}>
      <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={handleMoveEnd}
        minZoom={CANVAS_CONFIG.minZoom}
        maxZoom={CANVAS_CONFIG.maxZoom}
        snapToGrid
        snapGrid={CANVAS_CONFIG.snapGrid}
        panOnDrag={[1, 2]}
        selectionOnDrag
        onlyRenderVisibleElements
        nodesDraggable={!editingNodeId}
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
      <CanvasControls
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap((v) => !v)}
        onAutoLayout={() => void handleAutoLayout()}
      />
      </div>
    </NodeEditProvider>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
