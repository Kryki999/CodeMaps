"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { edgeTypes } from "./edges/LabeledEdge";
import { EdgeEditPanel } from "./edges/EdgeEditPanel";
import { nodeTypes } from "./nodes";
import { CanvasControls } from "./CanvasControls";
import { CANVAS_CONFIG } from "@/lib/constants";
import { relayoutDiagram } from "@/lib/auto-layout";
import { generateEdgeId } from "@/lib/diagram-history";
import { diagramNodeToFlowNode, type ArchitectureNodeData } from "@/lib/flow-adapters";
import { diagramEdgeToFlowEdge } from "@/lib/flow-edge-adapters";
import type { ArchitectureEdgeData } from "@/lib/flow-edge-adapters";
import { EdgeEditProvider } from "@/contexts/edge-edit-context";
import { NodeEditProvider } from "@/contexts/node-edit-context";
import { useDiagramHistory } from "@/hooks/useDiagramHistory";
import { useDiagramPersist } from "@/hooks/useDiagramPersist";
import { useDiagramStore } from "@/store/diagram-store";
import type { DiagramEdge } from "@/types/diagram";
import type { Node } from "@xyflow/react";

function CanvasInner() {
  const diagram = useDiagramStore((s) => s.diagram);
  const isInteracting = useDiagramStore((s) => s.isInteracting);
  const isApplyingHistory = useDiagramStore((s) => s.isApplyingHistory);
  const editingNodeId = useDiagramStore((s) => s.editingNodeId);
  const editingEdgeId = useDiagramStore((s) => s.editingEdgeId);
  const markAllNodesMoved = useDiagramStore((s) => s.markAllNodesMoved);
  const commitDiagram = useDiagramStore((s) => s.commitDiagram);
  const { onNodeDragStart, onNodeDragStop, onViewportChange } = useDiagramPersist();
  const { setViewport, fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useState(true);
  const initialViewportSet = useRef(false);
  const lastSyncedAt = useRef<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ArchitectureNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ArchitectureEdgeData>>([]);

  const syncFromDiagram = useCallback(() => {
    const current = useDiagramStore.getState().diagram;
    if (!current) return;
    lastSyncedAt.current = current.metadata.updatedAt;
    setNodes(current.nodes.map((n) => diagramNodeToFlowNode(n)));
    setEdges(current.edges.map((e) => diagramEdgeToFlowEdge(e)));
  }, [setNodes, setEdges]);

  useDiagramHistory({ onHistoryApplied: syncFromDiagram });

  useEffect(() => {
    if (!diagram || isInteracting || isApplyingHistory || editingNodeId || editingEdgeId) return;
    if (lastSyncedAt.current === diagram.metadata.updatedAt) return;
    syncFromDiagram();
  }, [
    diagram,
    isInteracting,
    isApplyingHistory,
    editingNodeId,
    editingEdgeId,
    syncFromDiagram,
  ]);

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
    markAllNodesMoved(laidOut.nodes.map((n) => n.id));
    lastSyncedAt.current = null;
    setNodes(laidOut.nodes.map((n) => diagramNodeToFlowNode(n)));

    const saved = await commitDiagram(laidOut);
    if (saved) {
      lastSyncedAt.current = saved.metadata.updatedAt;
      setNodes(saved.nodes.map((n) => diagramNodeToFlowNode(n)));
    }
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [diagram, markAllNodesMoved, commitDiagram, setNodes, fitView]);

  const handleNodesUpdate = useCallback(
    (updated: Node<ArchitectureNodeData>[]) => {
      setNodes(updated);
    },
    [setNodes],
  );

  const handleEdgesUpdate = useCallback(
    (updated: Edge<ArchitectureEdgeData>[]) => {
      setEdges(updated);
    },
    [setEdges],
  );

  const handleSyncRevisionBump = useCallback(() => {
    lastSyncedAt.current = null;
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      const current = useDiagramStore.getState().diagram;
      if (!current || !connection.source || !connection.target) return;

      if (connection.source === connection.target) return;

      if (connection.sourceHandle?.endsWith("-target")) return;
      if (connection.targetHandle?.endsWith("-source")) return;

      const duplicate = current.edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === (connection.sourceHandle ?? undefined) &&
          e.targetHandle === (connection.targetHandle ?? undefined),
      );
      if (duplicate) return;

      const newEdge: DiagramEdge = {
        id: generateEdgeId(connection.source, connection.target),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: "http",
      };

      const updated = { ...current, edges: [...current.edges, newEdge] };
      setEdges(updated.edges.map((e) => diagramEdgeToFlowEdge(e)));

      void commitDiagram(updated).then((saved) => {
        if (saved) {
          setEdges(saved.edges.map((e) => diagramEdgeToFlowEdge(e)));
          lastSyncedAt.current = saved.metadata.updatedAt;
        }
      });
    },
    [commitDiagram, setEdges],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const { setEditingEdgeId, setInteracting, markLocalWrite } = useDiagramStore.getState();
      setEditingEdgeId(edge.id);
      setInteracting(true);
      markLocalWrite();
    },
    [],
  );

  const handlePaneClick = useCallback(() => {
    const { editingEdgeId, setEditingEdgeId, setInteracting } = useDiagramStore.getState();
    if (editingEdgeId) {
      setEditingEdgeId(null);
      setInteracting(false);
    }
  }, []);

  if (!diagram) return null;

  const isEditMode = Boolean(editingNodeId || editingEdgeId);

  return (
    <NodeEditProvider onNodesUpdate={handleNodesUpdate} onSyncRevisionBump={handleSyncRevisionBump}>
      <EdgeEditProvider onEdgesUpdate={handleEdgesUpdate} onSyncRevisionBump={handleSyncRevisionBump}>
        <div className="relative h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            isValidConnection={(connection) =>
              Boolean(
                connection.source &&
                  connection.target &&
                  connection.source !== connection.target &&
                  connection.sourceHandle?.endsWith("-source") &&
                  connection.targetHandle?.endsWith("-target"),
              )
            }
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
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
            nodesDraggable={!isEditMode}
            nodesConnectable={!isEditMode}
            elementsSelectable
            connectionMode={ConnectionMode.Loose}
            connectionLineStyle={{ stroke: "#818cf8", strokeWidth: 2 }}
            defaultEdgeOptions={{ type: "default" }}
            className="bg-[#1a1a2e]"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#2a2a4a" />
            {showMinimap && (
              <MiniMap
                nodeColor="#16213e"
                maskColor="rgba(26, 26, 46, 0.7)"
                className="!border !border-slate-700 !bg-[#12122a]"
              />
            )}
          </ReactFlow>
          <EdgeEditPanel />
          <CanvasControls
            showMinimap={showMinimap}
            onToggleMinimap={() => setShowMinimap((v) => !v)}
            onAutoLayout={() => void handleAutoLayout()}
            onHistoryApplied={syncFromDiagram}
          />
        </div>
      </EdgeEditProvider>
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
