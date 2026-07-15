"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
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
import { useNodeEdit } from "@/contexts/node-edit-context";
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

const HANDLE_POSITIONS = [
  { side: "top", position: Position.Top, className: "!top-0 !left-1/2 !-translate-x-1/2" },
  { side: "right", position: Position.Right, className: "!right-0 !top-1/2 !-translate-y-1/2" },
  { side: "bottom", position: Position.Bottom, className: "!bottom-0 !left-1/2 !-translate-x-1/2" },
  { side: "left", position: Position.Left, className: "!left-0 !top-1/2 !-translate-y-1/2" },
] as const;

const HANDLE_CLASS =
  "node-handle !h-2.5 !w-2.5 !border-2 !border-[#1a1a2e] !bg-indigo-400 transition-all duration-150 hover:!h-3 hover:!w-3 hover:!bg-indigo-300";

function ArchitectureNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as ArchitectureNodeData;
  const status = nodeData.status ?? "planned";
  const colors = STATUS_COLORS[status];
  const Icon = NODE_ICONS[nodeData.nodeType] ?? Server;

  const { editingNodeId, startEditing, cancelEditing, saveNodeEdit } = useNodeEdit();
  const isEditing = editingNodeId === id;

  const [label, setLabel] = useState(nodeData.label);
  const [description, setDescription] = useState(nodeData.description ?? "");
  const [tech, setTech] = useState((nodeData.tech ?? []).join(", "));

  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setLabel(nodeData.label);
      setDescription(nodeData.description ?? "");
      setTech((nodeData.tech ?? []).join(", "));
    }
  }, [nodeData.label, nodeData.description, nodeData.tech, isEditing]);

  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => labelRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  const commitSave = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      await saveNodeEdit(id, { label, description, tech });
    } finally {
      isSavingRef.current = false;
    }
  }, [id, label, description, tech, saveNodeEdit]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isEditing) startEditing(id);
    },
    [id, isEditing, startEditing],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!isEditing) return;
      const related = e.relatedTarget as HTMLElement | null;
      if (related && containerRef.current?.contains(related)) return;
      requestAnimationFrame(() => {
        if (!containerRef.current?.contains(document.activeElement)) {
          void commitSave();
        }
      });
    },
    [commitSave, isEditing],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEditing();
        return;
      }
      if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
        e.preventDefault();
        void commitSave();
      }
      if (e.key === "Enter" && e.target instanceof HTMLTextAreaElement && e.metaKey) {
        e.preventDefault();
        void commitSave();
      }
    },
    [cancelEditing, commitSave],
  );

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`group rounded-lg border-2 bg-[#16213e] shadow-lg transition-all duration-200 ease-out ${
        isEditing
          ? "nodrag nopan min-w-[280px] max-w-[320px] scale-[1.02] px-3.5 py-3 ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#1a1a2e] shadow-indigo-500/25"
          : `min-w-[200px] max-w-[260px] px-3 py-2.5 ${selected ? "shadow-indigo-500/30" : ""}`
      }`}
      style={{ borderColor: isEditing ? "#818cf8" : colors.border }}
    >
      {HANDLE_POSITIONS.map(({ side, position, className }) => (
        <Handle
          key={`${side}-source`}
          id={`${side}-source`}
          type="source"
          position={position}
          className={`${HANDLE_CLASS} ${className}`}
        />
      ))}
      {HANDLE_POSITIONS.map(({ side, position, className }) => (
        <Handle
          key={`${side}-target`}
          id={`${side}-target`}
          type="target"
          position={position}
          className={`${HANDLE_CLASS} ${className}`}
        />
      ))}

      {isEditing ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-indigo-300" />
            <input
              ref={labelRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-md border border-indigo-500/40 bg-[#1a1a2e] px-2 py-1 text-sm font-semibold text-slate-100 outline-none focus:border-indigo-400"
              placeholder="Nazwa komponentu"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Technologie
            </label>
            <input
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              className="w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400"
              placeholder="Next.js, React, PostgreSQL..."
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Opis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2 py-1 text-xs leading-snug text-slate-300 outline-none focus:border-indigo-400"
              placeholder="Krótki opis roli komponentu..."
            />
          </div>

          <p className="text-[10px] text-slate-500">Enter zapisuje · Esc anuluje</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-slate-300" />
            <span className="truncate text-sm font-semibold text-slate-100">{nodeData.label}</span>
          </div>

          {nodeData.tech && nodeData.tech.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {nodeData.tech.map((t) => (
                <span
                  key={t}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.badge}`}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {nodeData.description && (
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-400">
              {nodeData.description}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export const ArchitectureNode = memo(ArchitectureNodeComponent);
