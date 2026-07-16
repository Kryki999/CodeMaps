"use client";

import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { Breadcrumbs } from "@/components/toolbar/Breadcrumbs";
import { ProjectToolbar } from "@/components/toolbar/ProjectToolbar";
import { useDiagramSync } from "@/hooks/useDiagramSync";
import { useDiagramStore } from "@/store/diagram-store";

export function Workspace() {
  useDiagramSync();

  const isLoading = useDiagramStore((s) => s.isLoading);
  const error = useDiagramStore((s) => s.error);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1a1a2e]">
      <ProjectToolbar />
      <Breadcrumbs />
      <main className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1a1a2e]/80">
            <p className="text-sm text-slate-400">Ładowanie diagramu...</p>
          </div>
        )}
        {error && (
          <div className="absolute left-4 top-4 z-20 rounded-md border border-red-800 bg-red-950/80 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <DiagramCanvas />
      </main>
    </div>
  );
}
