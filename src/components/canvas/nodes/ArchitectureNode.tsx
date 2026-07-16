"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Box,
  ClipboardCopy,
  Database,
  DoorOpen,
  Globe,
  HardDrive,
  Layers,
  Link2,
  Radio,
  Server,
} from "lucide-react";
import { HEALTH_COLORS, STATUS_COLORS } from "@/lib/constants";
import { buildAgentPrompt } from "@/lib/agent-prompt";
import { useNodeEdit } from "@/contexts/node-edit-context";
import { useDiagramStore } from "@/store/diagram-store";
import type { ArchitectureNodeData } from "@/lib/flow-adapters";
import type { NodeHealth, NodeStatus, NodeType, StackProfile } from "@/types/diagram";

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

const STATUS_OPTIONS: { value: NodeStatus; label: string }[] = [
  { value: "planned", label: "Planowane" },
  { value: "existing", label: "Istniejące" },
  { value: "deprecated", label: "Deprecated" },
];

const HEALTH_OPTIONS: { value: NodeHealth; label: string }[] = [
  { value: "stable", label: "Stabilne" },
  { value: "warning", label: "W budowie" },
  { value: "critical", label: "Krytyczne" },
];

function ArchitectureNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as ArchitectureNodeData;
  const status = nodeData.status ?? "planned";
  const health = nodeData.health ?? "stable";
  const colors = STATUS_COLORS[status];
  const healthStyle = HEALTH_COLORS[health];
  const Icon = NODE_ICONS[nodeData.nodeType] ?? Server;
  const childrenCount = nodeData.childrenCount ?? 0;
  const externalEdgeCount = nodeData.externalEdgeCount ?? 0;

  const { editingNodeId, startEditing, cancelEditing, saveNodeEdit, enterNode } =
    useNodeEdit();
  const isEditing = editingNodeId === id;

  const [label, setLabel] = useState(nodeData.label);
  const [description, setDescription] = useState(nodeData.description ?? "");
  const [tech, setTech] = useState((nodeData.tech ?? []).join(", "));
  const [statusValue, setStatusValue] = useState<NodeStatus>(status);
  const [healthValue, setHealthValue] = useState<NodeHealth>(health);
  const [deps, setDeps] = useState((nodeData.deps ?? []).join(", "));
  const [exportsList, setExportsList] = useState((nodeData.exports ?? []).join(", "));
  const [codeRef, setCodeRef] = useState(nodeData.codeRef ?? "");
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptFallback, setPromptFallback] = useState<string | null>(null);
  const [promptBusy, setPromptBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setLabel(nodeData.label);
      setDescription(nodeData.description ?? "");
      setTech((nodeData.tech ?? []).join(", "));
      setStatusValue(nodeData.status ?? "planned");
      setHealthValue(nodeData.health ?? "stable");
      setDeps((nodeData.deps ?? []).join(", "));
      setExportsList((nodeData.exports ?? []).join(", "));
      setCodeRef(nodeData.codeRef ?? "");
    }
  }, [
    nodeData.label,
    nodeData.description,
    nodeData.tech,
    nodeData.status,
    nodeData.health,
    nodeData.deps,
    nodeData.exports,
    nodeData.codeRef,
    isEditing,
  ]);

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
      await saveNodeEdit(id, {
        label,
        description,
        tech,
        status: statusValue,
        health: healthValue,
        deps,
        exports: exportsList,
        codeRef,
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [
    id,
    label,
    description,
    tech,
    statusValue,
    healthValue,
    deps,
    exportsList,
    codeRef,
    saveNodeEdit,
  ]);

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

  const handleEnter = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      enterNode(id);
    },
    [enterNode, id],
  );

  const handleCopyAgentPrompt = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const diagram = useDiagramStore.getState().diagram;
      if (!diagram) return;

      setPromptBusy(true);
      setPromptFallback(null);
      try {
        let stackProfile: StackProfile = "next";
        try {
          const res = await fetch("/api/codemaps-config");
          if (res.ok) {
            const data = (await res.json()) as { stackProfile?: StackProfile };
            if (data.stackProfile === "react-native") stackProfile = "react-native";
          }
        } catch {
          // keep default next
        }

        const prompt = buildAgentPrompt(diagram, id, stackProfile);

        try {
          await navigator.clipboard.writeText(prompt);
          setPromptCopied(true);
          setTimeout(() => setPromptCopied(false), 2000);
        } catch {
          setPromptFallback(prompt);
        }
      } finally {
        setPromptBusy(false);
      }
    },
    [id],
  );

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`group relative rounded-lg border-2 bg-[#16213e] shadow-lg transition-all duration-200 ease-out ${
        isEditing
          ? "nodrag nopan min-w-[300px] max-w-[340px] scale-[1.02] px-3.5 py-3 ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#1a1a2e] shadow-indigo-500/25"
          : `min-w-[200px] max-w-[260px] px-3 py-2.5 ${selected ? "shadow-indigo-500/30" : ""}`
      }`}
      style={{ borderColor: isEditing ? "#818cf8" : colors.border }}
    >
      {/* Health dot */}
      <span
        title={healthStyle.label}
        className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full shadow ${healthStyle.glow} ${
          health === "critical" ? "animate-pulse" : ""
        }`}
        style={{ backgroundColor: healthStyle.dot }}
      />

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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Lifecycle
              </label>
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as NodeStatus)}
                className="w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Health
              </label>
              <select
                value={healthValue}
                onChange={(e) => setHealthValue(e.target.value as NodeHealth)}
                className="w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400"
              >
                {HEALTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Technologie
            </label>
            <input
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              className="w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400"
              placeholder="Next.js, React..."
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Zależności
            </label>
            <input
              value={deps}
              onChange={(e) => setDeps(e.target.value)}
              className="w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400"
              placeholder="zod, express..."
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Eksporty / funkcje
            </label>
            <input
              value={exportsList}
              onChange={(e) => setExportsList(e.target.value)}
              className="w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400"
              placeholder="handleLogin, AuthProvider..."
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              codeRef
            </label>
            <input
              value={codeRef}
              onChange={(e) => setCodeRef(e.target.value)}
              className="w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400"
              placeholder="src/features/auth/..."
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

          {childrenCount > 0 && (
            <button
              type="button"
              onClick={handleEnter}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-indigo-500/20 px-2 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/30"
            >
              <DoorOpen className="h-3.5 w-3.5" />
              Wejdź do środka ({childrenCount})
            </button>
          )}

          <button
            type="button"
            onClick={(e) => void handleCopyAgentPrompt(e)}
            disabled={promptBusy}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-600/80 bg-[#1a1a2e] px-2 py-1.5 text-xs font-medium text-slate-200 transition hover:border-indigo-500/50 hover:text-indigo-200 disabled:opacity-50"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            {promptBusy
              ? "Buduję prompt…"
              : promptCopied
                ? "Skopiowano!"
                : "Prompt dla agenta"}
          </button>

          {promptFallback && (
            <div className="space-y-1">
              <p className="text-[10px] text-amber-400/90">
                Schowek niedostępny — skopiuj ręcznie:
              </p>
              <textarea
                readOnly
                value={promptFallback}
                rows={6}
                className="nodrag nopan w-full resize-y rounded-md border border-slate-600/60 bg-[#12122a] px-2 py-1 font-mono text-[10px] leading-snug text-slate-300 outline-none"
                onFocus={(e) => e.target.select()}
              />
            </div>
          )}

          <p className="text-[10px] text-slate-500">
            Enter zapisuje · Esc anuluje · Prompt → wklej w Cursor
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-slate-300" />
            <span className="truncate text-sm font-semibold text-slate-100">
              {nodeData.label}
            </span>
            {childrenCount > 0 && (
              <span
                className="ml-auto rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300"
                title="Ma poziomy wewnętrzne"
              >
                {childrenCount}
              </span>
            )}
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

          {externalEdgeCount > 0 && (
            <div
              className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-400/90"
              title="Połączenia cross-level (poza tym poziomem)"
            >
              <Link2 className="h-3 w-3" />
              {externalEdgeCount} zewn.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const ArchitectureNode = memo(ArchitectureNodeComponent);
