"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EDGE_TYPES } from "@/lib/constants";
import {
  flagsToLineStyle,
  useEdgeEdit,
  type LineStyle,
} from "@/contexts/edge-edit-context";
import { useDiagramStore } from "@/store/diagram-store";
import type { EdgeType } from "@/types/diagram";

const LINE_STYLES: { id: LineStyle; label: string }[] = [
  { id: "solid", label: "Ciągła" },
  { id: "dashed", label: "Przerywana" },
  { id: "animated", label: "Animowana" },
];

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  http: "HTTP",
  websocket: "WebSocket",
  event: "Event",
  dependency: "Zależność",
  "data-flow": "Przepływ danych",
};

export function EdgeEditPanel() {
  const diagram = useDiagramStore((s) => s.diagram);
  const { editingEdgeId, cancelEditing, saveEdgeEdit, deleteEdge } = useEdgeEdit();

  const labelRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const edge = diagram?.edges.find((e) => e.id === editingEdgeId);
  const [lineStyle, setLineStyle] = useState<LineStyle>("solid");

  useEffect(() => {
    if (edge) setLineStyle(flagsToLineStyle(edge));
  }, [edge, editingEdgeId]);

  useEffect(() => {
    if (editingEdgeId) {
      const timer = setTimeout(() => labelRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingEdgeId]);

  const handleSave = useCallback(async () => {
      if (!editingEdgeId) return;
      const label = labelRef.current?.value ?? "";
      const edgeType = (document.getElementById("edge-type-select") as HTMLSelectElement)
        ?.value ?? "http";
      await saveEdgeEdit(editingEdgeId, {
        label,
        edgeType: edgeType as EdgeType,
        lineStyle,
      });
    },
    [editingEdgeId, lineStyle, saveEdgeEdit],
  );

  if (!editingEdgeId || !edge) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        ref={panelRef}
        className="pointer-events-auto absolute left-1/2 top-20 w-[300px] -translate-x-1/2 rounded-xl border border-indigo-500/40 bg-[#16213e] p-4 shadow-2xl shadow-indigo-500/10 ring-2 ring-indigo-400/60"
        onKeyDown={(e) => {
          if (e.key === "Escape") cancelEditing();
        }}
      >
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Edycja połączenia</h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Etykieta
          </label>
          <input
            ref={labelRef}
            name="label"
            defaultValue={edge.label ?? ""}
            className="mb-3 w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-400"
            placeholder="np. Wysyła dane JSON"
          />

          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Typ połączenia
          </label>
          <select
            id="edge-type-select"
            name="edgeType"
            defaultValue={edge.type ?? "http"}
            className="mb-3 w-full rounded-md border border-slate-600/60 bg-[#1a1a2e] px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-400"
          >
            {EDGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {EDGE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Styl linii
          </label>
          <div className="mb-4 flex gap-1.5">
            {LINE_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setLineStyle(style.id)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-center text-[11px] font-medium transition-colors ${
                  lineStyle === style.id
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-slate-600/60 text-slate-400 hover:border-slate-500"
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void deleteEdge(editingEdgeId)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40"
            >
              Usuń
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="rounded-md border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                Zapisz
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
