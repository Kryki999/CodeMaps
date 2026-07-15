"use client";

import { useEffect } from "react";
import { useDiagramStore } from "@/store/diagram-store";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

interface UseDiagramHistoryOptions {
  onHistoryApplied?: () => void;
}

export function useDiagramHistory({ onHistoryApplied }: UseDiagramHistoryOptions = {}) {
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (!e.ctrlKey && !e.metaKey) return;

      const key = e.key.toLowerCase();

      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        void undo().then(() => onHistoryApplied?.());
        return;
      }

      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        void redo().then(() => onHistoryApplied?.());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, onHistoryApplied]);
}
