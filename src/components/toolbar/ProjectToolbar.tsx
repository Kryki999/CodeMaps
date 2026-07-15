"use client";

import { useRef, useState } from "react";
import { Download, FilePlus, Upload, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NewProjectDialog } from "@/components/ui/Dialog";
import { useDiagramPersist } from "@/hooks/useDiagramPersist";
import { createEmptyDiagram, formatValidationError } from "@/lib/schema";
import { useDiagramStore } from "@/store/diagram-store";
import type { Diagram } from "@/types/diagram";

export function ProjectToolbar() {
  const diagram = useDiagramStore((s) => s.diagram);
  const isConnected = useDiagramStore((s) => s.isConnected);
  const setDiagram = useDiagramStore((s) => s.setDiagram);
  const clearUserMovedNodes = useDiagramStore((s) => s.clearUserMovedNodes);
  const updateMetadataName = useDiagramStore((s) => s.updateMetadataName);
  const setError = useDiagramStore((s) => s.setError);
  const { saveNow } = useDiagramPersist();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!diagram) return;
    const slug = diagram.metadata.name.replace(/\s+/g, "-").toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(diagram, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${slug}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const validationError = formatValidationError(json);
      if (validationError) {
        setError(validationError);
        return;
      }
      const imported = json as Diagram;
      clearUserMovedNodes();
      await saveNow(imported);
      setDiagram(imported);
    } catch {
      setError("Nie udało się wczytać pliku JSON");
    }
  };

  const handleNewProject = async (name: string) => {
    const empty = createEmptyDiagram(name);
    clearUserMovedNodes();
    await saveNow(empty);
    setDiagram(empty);
    setShowNewDialog(false);
  };

  const commitName = async () => {
    if (!diagram || !nameDraft.trim()) {
      setIsEditingName(false);
      return;
    }
    const updated: Diagram = {
      ...diagram,
      metadata: { ...diagram.metadata, name: nameDraft.trim() },
    };
    updateMetadataName(nameDraft.trim());
    await saveNow(updated);
    setIsEditingName(false);
  };

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 bg-[#12122a] px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-wide text-indigo-400">CodeMaps</span>
          {diagram && (
            isEditingName ? (
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => void commitName()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitName();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                className="rounded border border-slate-600 bg-[#1a1a2e] px-2 py-0.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(diagram.metadata.name);
                  setIsEditingName(true);
                }}
                className="text-sm text-slate-300 hover:text-white"
              >
                {diagram.metadata.name}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 text-xs ${isConnected ? "text-green-400" : "text-slate-500"}`}
            title={isConnected ? "Połączono (SSE)" : "Brak połączenia"}
          >
            {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isConnected ? "Live" : "Offline"}
          </span>

          <Button variant="ghost" onClick={() => setShowNewDialog(true)}>
            <FilePlus className="h-4 w-4" />
            Nowy
          </Button>
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Wgraj
          </Button>
          <Button variant="default" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Pobierz
          </Button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImport(file);
          e.target.value = "";
        }}
      />

      <NewProjectDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onConfirm={(name) => void handleNewProject(name)}
      />
    </>
  );
}
