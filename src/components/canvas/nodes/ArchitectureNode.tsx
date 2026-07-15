import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Box,
  Database,
  Globe,
  HardDrive,
  Layers,
  Radio,
  Server,
} from "lucide-react";
import { STATUS_COLORS } from "@/lib/constants";
import type { ArchitectureNodeData } from "@/lib/flow-adapters";
import type { NodeType } from "@/types/diagram";

const NODE_ICONS: Record<NodeType, typeof Server> = {
  service: Server,
  database: Database,
  component: Box,
  queue: Radio,
  cache: HardDrive,
  external: Globe,
  group: Layers,
};

function ArchitectureNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as ArchitectureNodeData;
  const status = nodeData.status ?? "planned";
  const colors = STATUS_COLORS[status];
  const Icon = NODE_ICONS[nodeData.nodeType] ?? Server;

  return (
    <div
      className={`min-w-[200px] max-w-[260px] rounded-lg border-2 bg-[#16213e] px-3 py-2.5 shadow-lg transition-shadow ${
        selected ? "shadow-indigo-500/30" : ""
      }`}
      style={{ borderColor: colors.border }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />

      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-slate-300" />
        <span className="truncate text-sm font-semibold text-slate-100">{nodeData.label}</span>
      </div>

      {nodeData.tech && nodeData.tech.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {nodeData.tech.map((tech) => (
            <span
              key={tech}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.badge}`}
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {nodeData.description && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-400">
          {nodeData.description}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
}

export const ArchitectureNode = memo(ArchitectureNodeComponent);
