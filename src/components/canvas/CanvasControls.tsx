"use client";

import { LayoutGrid, Map, Maximize2, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useDiagramStore } from "@/store/diagram-store";

interface CanvasControlsProps {
  showMinimap: boolean;
  onToggleMinimap: () => void;
  onAutoLayout: () => void;
  onHistoryApplied?: () => void;
}

export function CanvasControls({
  showMinimap,
  onToggleMinimap,
  onAutoLayout,
  onHistoryApplied,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const canUndo = useDiagramStore((s) => s.historyPast.length > 0);
  const canRedo = useDiagramStore((s) => s.historyFuture.length > 0);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void undo().then(() => onHistoryApplied?.())}
        disabled={!canUndo}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-[#16213e] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Cofnij (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => void redo().then(() => onHistoryApplied?.())}
        disabled={!canRedo}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-[#16213e] text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Ponów (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onAutoLayout}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-indigo-600/60 bg-indigo-950/80 text-indigo-300 hover:bg-indigo-900/60"
        title="Uporządkuj automatycznie"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => zoomIn({ duration: 200 })}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-[#16213e] text-slate-300 hover:bg-slate-800"
        title="Powiększ"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => zoomOut({ duration: 200 })}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-[#16213e] text-slate-300 hover:bg-slate-800"
        title="Pomniejsz"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => fitView({ padding: 0.2, duration: 300 })}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-[#16213e] text-slate-300 hover:bg-slate-800"
        title="Dopasuj widok"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToggleMinimap}
        className={`flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 ${
          showMinimap ? "bg-indigo-900/50" : "bg-[#16213e]"
        }`}
        title="Mini-mapa"
      >
        <Map className="h-4 w-4" />
      </button>
    </div>
  );
}
