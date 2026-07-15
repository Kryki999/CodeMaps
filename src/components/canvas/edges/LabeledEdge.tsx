"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { ArchitectureEdgeData } from "@/lib/flow-edge-adapters";

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

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          ...style,
          stroke: selected ? "#818cf8" : "#475569",
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: isDashed ? "6 4" : undefined,
        }}
        className={animated ? "animated" : undefined}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded bg-[#1a1a2e]/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-300"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
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
