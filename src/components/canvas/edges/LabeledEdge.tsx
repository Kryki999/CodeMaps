"use client";

import { memo, useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";
import { EDGE_ROUTE_SPREAD } from "@/lib/edge-routing";
import type { ArchitectureEdgeData } from "@/lib/flow-edge-adapters";

function staggerCenters(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  routeIndex: number,
  routeCount: number,
): { centerX: number; centerY: number } {
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  if (routeCount <= 1) return { centerX: midX, centerY: midY };

  const delta = (routeIndex - (routeCount - 1) / 2) * EDGE_ROUTE_SPREAD;
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);

  // Horizontal-ish: separate corridors vertically; vertical-ish: separate horizontally
  if (dx >= dy) {
    return { centerX: midX, centerY: midY + delta };
  }
  return { centerX: midX + delta, centerY: midY };
}

function LabeledEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  markerEnd,
  style,
  selected,
  animated,
}: EdgeProps) {
  const edgeData = data as ArchitectureEdgeData | undefined;
  const isDashed = edgeData?.dashed ?? false;
  const displayLabel = edgeData?.label ?? label;
  const routeIndex = edgeData?.routeIndex ?? 0;
  const routeCount = edgeData?.routeCount ?? 1;

  const [edgePath, labelX, labelY] = useMemo(() => {
    const { centerX, centerY } = staggerCenters(
      sourceX,
      sourceY,
      targetX,
      targetY,
      routeIndex,
      routeCount,
    );

    return getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition: sourcePosition ?? Position.Bottom,
      targetPosition: targetPosition ?? Position.Top,
      borderRadius: 10,
      offset: 18 + Math.min(routeIndex, 4) * 4,
      centerX,
      centerY,
    });
  }, [
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    routeIndex,
    routeCount,
  ]);

  // Nudge labels so stacked edges don't share one label blob
  const labelNudge =
    routeCount > 1 ? (routeIndex - (routeCount - 1) / 2) * 12 : 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{
          ...style,
          stroke: selected ? "#818cf8" : "#64748b",
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: isDashed ? "6 4" : undefined,
          opacity: selected ? 1 : 0.85,
        }}
        className={animated ? "animated" : undefined}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className={`nodrag nopan pointer-events-none absolute rounded px-1.5 py-0.5 text-[10px] font-medium ${
              selected
                ? "bg-indigo-500/25 text-indigo-100"
                : "bg-[#1a1a2e]/92 text-slate-300"
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + labelNudge}px)`,
            }}
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const LabeledEdge = memo(LabeledEdgeComponent);

export const edgeTypes = {
  http: LabeledEdge,
  websocket: LabeledEdge,
  event: LabeledEdge,
  dependency: LabeledEdge,
  "data-flow": LabeledEdge,
  default: LabeledEdge,
};
