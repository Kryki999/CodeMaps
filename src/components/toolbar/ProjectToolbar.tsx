"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronUp,
  Download,
  FilePlus,
  FolderCog,
  FolderOpen,
  GitCompareArrows,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, NewProjectDialog } from "@/components/ui/Dialog";
import { useDiagramPersist } from "@/hooks/useDiagramPersist";
import { createEmptyDiagram } from "@/lib/schema";
import { migrateDiagram } from "@/lib/diagram-migrate";
import { useDiagramStore } from "@/store/diagram-store";
import type { Diagram, StackProfile } from "@/types/diagram";
import type { DriftReport } from "@/lib/drift-types";

interface ConfigResponse {
  projectRoot: string;
  diagramRelativePath: string;
  stackProfile?: StackProfile;
  projectRootAbsolute?: string;
  diagramPath?: string;
}

interface PickedFolderPayload {
  cancelled?: boolean;
  path?: string;
  hasArchitecture?: boolean;
  diagramRelativePath?: string;
  stackProfile?: StackProfile;
  message?: string;
  error?: string;
}

interface DirListing {
  path: string;
  parent: string | null;
  entries: { name: string; path: string }[];
}

export function ProjectToolbar() {
  const diagram = useDiagramStore((s) => s.diagram);
  const isConnected = useDiagramStore((s) => s.isConnected);
  const clearUserMovedNodes = useDiagramStore((s) => s.clearUserMovedNodes);
  const clearHistory = useDiagramStore((s) => s.clearHistory);
  const updateMetadataName = useDiagramStore((s) => s.updateMetadataName);
  const setError = useDiagramStore((s) => s.setError);
  const setActiveParentId = useDiagramStore((s) => s.setActiveParentId);
  const { saveNow } = useDiagramPersist();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [projectRoot, setProjectRoot] = useState(".");
  const [diagramRelativePath, setDiagramRelativePath] = useState(
    ".codemaps/architecture.json",
  );
  const [stackProfile, setStackProfile] = useState<StackProfile>("next");
  const [configMeta, setConfigMeta] = useState<string>("");
  const [configSaving, setConfigSaving] = useState(false);
  const [pickingFolder, setPickingFolder] = useState(false);
  const [showBrowseDialog, setShowBrowseDialog] = useState(false);
  const [browseListing, setBrowseListing] = useState<DirListing | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [showDriftDialog, setShowDriftDialog] = useState(false);
  const [driftLoading, setDriftLoading] = useState(false);
  const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showConfigDialog) return;
    void (async () => {
      try {
        const res = await fetch("/api/codemaps-config");
        if (!res.ok) throw new Error("Nie udało się wczytać konfiguracji");
        const data = (await res.json()) as ConfigResponse;
        setProjectRoot(data.projectRoot);
        setDiagramRelativePath(data.diagramRelativePath);
        setStackProfile(data.stackProfile === "react-native" ? "react-native" : "next");
        setConfigMeta(
          data.diagramPath
            ? `Aktywna mapa: ${data.diagramPath}`
            : "",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd konfiguracji");
      }
    })();
  }, [showConfigDialog, setError]);

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
      const imported = migrateDiagram(json);
      clearUserMovedNodes();
      clearHistory();
      setActiveParentId(null);
      await saveNow(imported);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się wczytać pliku JSON",
      );
    }
  };

  const handleNewProject = async (name: string) => {
    const empty = createEmptyDiagram(name);
    clearUserMovedNodes();
    clearHistory();
    setActiveParentId(null);
    await saveNow(empty);
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

  const openDrift = async () => {
    setShowDriftDialog(true);
    setDriftLoading(true);
    setDriftReport(null);
    try {
      const res = await fetch("/api/diagram/drift");
      const data = (await res.json()) as DriftReport & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Nie udało się zbudować raportu drift");
      setDriftReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd drift");
      setShowDriftDialog(false);
    } finally {
      setDriftLoading(false);
    }
  };

  const applyPickedFolder = (data: PickedFolderPayload) => {
    if (!data.path) return;
    setProjectRoot(data.path);
    if (data.diagramRelativePath) {
      setDiagramRelativePath(data.diagramRelativePath);
    }
    if (data.stackProfile === "next" || data.stackProfile === "react-native") {
      setStackProfile(data.stackProfile);
    }
    setConfigMeta(data.message ?? `Wybrano: ${data.path}`);
  };

  const loadBrowseListing = async (dirPath?: string) => {
    setBrowseLoading(true);
    try {
      const qs = dirPath ? `?path=${encodeURIComponent(dirPath)}` : "";
      const res = await fetch(`/api/project/browse${qs}`);
      const data = (await res.json()) as DirListing & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Nie udało się listować folderu");
      setBrowseListing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd przeglądania");
    } finally {
      setBrowseLoading(false);
    }
  };

  const openBrowseDialog = async () => {
    setShowBrowseDialog(true);
    await loadBrowseListing();
  };

  /** Native OS dialog — may appear behind the browser; check taskbar. */
  const pickProjectFolderNative = async () => {
    setPickingFolder(true);
    try {
      const res = await fetch("/api/project/pick-folder", { method: "POST" });
      const data = (await res.json()) as PickedFolderPayload;
      if (!res.ok) throw new Error(data.error ?? "Wybór folderu nie powiódł się");
      if (data.cancelled || !data.path) return;
      applyPickedFolder(data);
      setShowBrowseDialog(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} — użyj przeglądarki folderów poniżej.`
          : "Błąd wyboru folderu",
      );
      if (!showBrowseDialog) await openBrowseDialog();
    } finally {
      setPickingFolder(false);
    }
  };

  const confirmBrowseFolder = async () => {
    if (!browseListing?.path) return;
    setPickingFolder(true);
    try {
      const res = await fetch("/api/project/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: browseListing.path }),
      });
      const data = (await res.json()) as PickedFolderPayload;
      if (!res.ok) throw new Error(data.error ?? "Nie udało się wybrać folderu");
      applyPickedFolder(data);
      setShowBrowseDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd wyboru folderu");
    } finally {
      setPickingFolder(false);
    }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/codemaps-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectRoot, diagramRelativePath, stackProfile }),
      });
      const data = (await res.json()) as ConfigResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Zapis konfiguracji nie powiódł się");
      setConfigMeta(
        data.diagramPath ? `Aktywna mapa: ${data.diagramPath}` : "",
      );
      setShowConfigDialog(false);
      // Reload diagram from new path
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu konfiguracji");
    } finally {
      setConfigSaving(false);
    }
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

          <Button variant="ghost" onClick={() => void openDrift()} title="Raport driftu kod ↔ mapa">
            <GitCompareArrows className="h-4 w-4" />
            Drift
          </Button>
          <Button variant="ghost" onClick={() => setShowConfigDialog(true)} title="Ścieżka projektu">
            <FolderCog className="h-4 w-4" />
            Projekt
          </Button>
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

      <Dialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
        title="Mapowany projekt"
      >
        <p className="mb-3 text-xs leading-relaxed text-slate-400">
          Wybierz folder projektu (przeglądarka w aplikacji jest pewniejsza niż okno
          systemu) albo wpisz ścieżkę ręcznie. Po zapisie wczyta się mapa z{" "}
          <code className="text-slate-300">.codemaps/architecture.json</code>.
        </p>
        <label className="block text-xs text-slate-400">projectRoot</label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            value={projectRoot}
            onChange={(e) => setProjectRoot(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-600 bg-[#1a1a2e] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            placeholder="."
          />
          <Button
            variant="default"
            disabled={pickingFolder}
            onClick={() => void openBrowseDialog()}
            title="Przeglądaj foldery w aplikacji"
            className="shrink-0"
          >
            <FolderOpen className="h-4 w-4" />
            Wybierz…
          </Button>
        </div>
        <button
          type="button"
          disabled={pickingFolder}
          onClick={() => void pickProjectFolderNative()}
          className="mt-1 text-[10px] text-indigo-300/90 underline-offset-2 hover:underline disabled:opacity-50"
        >
          {pickingFolder ? "Czekam na okno systemu…" : "Albo otwórz okno systemu Windows"}
        </button>
        {pickingFolder && (
          <p className="mt-1 text-[10px] text-amber-300/90">
            Jeśli okno jest otwarte, ale go nie widać — sprawdź pasek zadań (może być za
            przeglądarką).
          </p>
        )}
        <label className="mt-3 block text-xs text-slate-400">diagramRelativePath</label>
        <input
          value={diagramRelativePath}
          onChange={(e) => setDiagramRelativePath(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-600 bg-[#1a1a2e] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
        />
        <label className="mt-3 block text-xs text-slate-400">stackProfile (Faza 3)</label>
        <select
          value={stackProfile}
          onChange={(e) => setStackProfile(e.target.value as StackProfile)}
          className="mt-1 w-full rounded-md border border-slate-600 bg-[#1a1a2e] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
        >
          <option value="next">next — Next.js App Router</option>
          <option value="react-native">react-native — Expo / RN</option>
        </select>
        <p className="mt-1 text-[10px] text-slate-500">
          Profil wpływa na prompt „Prompt dla agenta” (ścieżki i konwencje scaffoldu).
        </p>
        {configMeta && (
          <p className="mt-2 break-all text-[10px] text-slate-500">{configMeta}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowConfigDialog(false)}>
            Anuluj
          </Button>
          <Button variant="default" disabled={configSaving} onClick={() => void saveConfig()}>
            {configSaving ? "Zapis…" : "Zapisz"}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={showBrowseDialog}
        onClose={() => setShowBrowseDialog(false)}
        title="Wybierz folder projektu"
        className="max-w-lg"
      >
        <p className="mb-2 break-all rounded-md border border-slate-700/80 bg-[#12122a] px-2 py-1.5 font-mono text-[11px] text-slate-300">
          {browseListing?.path ?? "…"}
        </p>
        <div className="mb-2 flex gap-2">
          <Button
            variant="ghost"
            disabled={browseLoading || !browseListing?.parent}
            onClick={() => {
              if (browseListing?.parent) void loadBrowseListing(browseListing.parent);
            }}
          >
            <ChevronUp className="h-4 w-4" />
            W górę
          </Button>
          <Button
            variant="ghost"
            disabled={pickingFolder}
            onClick={() => void pickProjectFolderNative()}
          >
            Okno systemu
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-md border border-slate-700/80 bg-[#12122a]">
          {browseLoading && (
            <p className="px-3 py-4 text-xs text-slate-400">Ładuję…</p>
          )}
          {!browseLoading && browseListing?.entries.length === 0 && (
            <p className="px-3 py-4 text-xs text-slate-500">Brak podfolderów</p>
          )}
          {!browseLoading &&
            browseListing?.entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => void loadBrowseListing(entry.path)}
                className="flex w-full items-center gap-2 border-b border-slate-800/80 px-3 py-2 text-left text-xs text-slate-200 last:border-0 hover:bg-indigo-500/15"
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
                <span className="truncate">{entry.name}</span>
              </button>
            ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowBrowseDialog(false)}>
            Anuluj
          </Button>
          <Button
            variant="default"
            disabled={pickingFolder || !browseListing?.path}
            onClick={() => void confirmBrowseFolder()}
          >
            {pickingFolder ? "…" : "Użyj tego folderu"}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={showDriftDialog}
        onClose={() => setShowDriftDialog(false)}
        title="Drift: kod ↔ mapa"
        className="max-w-2xl"
      >
        {driftLoading && (
          <p className="text-xs text-slate-400">Skanuję projectRoot…</p>
        )}
        {!driftLoading && driftReport && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              profile=<code className="text-slate-300">{driftReport.stackProfile}</code>
              {" · "}
              scanned={driftReport.scannedPathCount}
              {driftReport.truncated ? " (truncated)" : ""}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-200">
                missing_on_map: {driftReport.summary.missingOnMap}
              </span>
              <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-200">
                broken_codeRef: {driftReport.summary.brokenCodeRef}
              </span>
              <span className="rounded bg-slate-500/20 px-2 py-0.5 text-slate-300">
                missing_codeRef: {driftReport.summary.missingCodeRef}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Raport tylko do odczytu — nie zapisuje mapy. Popraw{" "}
              <code className="text-slate-400">.codemaps/architecture.json</code> ręcznie lub
              agentem (Flow E).
            </p>
            <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-md border border-slate-700/80 bg-[#12122a] p-2">
              {driftReport.findings.length === 0 ? (
                <p className="text-xs text-green-400">Brak driftu — OK.</p>
              ) : (
                driftReport.findings.map((f, i) => (
                  <div
                    key={`${f.kind}-${f.nodeId ?? ""}-${f.path ?? ""}-${i}`}
                    className="border-b border-slate-800/80 pb-1.5 text-[11px] last:border-0"
                  >
                    <span className="font-medium text-indigo-300">{f.kind}</span>
                    {f.nodeId && (
                      <span className="text-slate-400"> · node={f.nodeId}</span>
                    )}
                    {f.path && (
                      <div className="break-all text-slate-300">path: {f.path}</div>
                    )}
                    {f.codeRef && (
                      <div className="break-all text-slate-400">codeRef: {f.codeRef}</div>
                    )}
                    {f.hint && (
                      <div className="break-all text-slate-500">{f.hint}</div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setShowDriftDialog(false)}>
                Zamknij
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
