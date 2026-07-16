"use client";

import { ChevronRight } from "lucide-react";
import { buildBreadcrumbTrail } from "@/lib/hierarchy";
import { useDiagramStore } from "@/store/diagram-store";

export function Breadcrumbs() {
  const diagram = useDiagramStore((s) => s.diagram);
  const activeParentId = useDiagramStore((s) => s.activeParentId);
  const navigateToParent = useDiagramStore((s) => s.navigateToParent);

  if (!diagram) return null;

  const trail = buildBreadcrumbTrail(diagram.nodes, activeParentId);

  return (
    <nav
      aria-label="Poziom architektury"
      className="flex h-9 shrink-0 items-center gap-1 border-b border-slate-800/80 bg-[#12122a]/80 px-4"
    >
      {trail.map((crumb, index) => {
        const isLast = index === trail.length - 1;
        return (
          <div key={crumb.id ?? "system"} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}
            {isLast ? (
              <span className="text-xs font-medium text-slate-200">{crumb.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => navigateToParent(crumb.id)}
                className="text-xs text-slate-400 transition hover:text-indigo-300"
              >
                {crumb.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
