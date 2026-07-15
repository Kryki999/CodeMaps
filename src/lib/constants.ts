export const DIAGRAM_VERSION = "1.0" as const;

export const DIAGRAM_FILE_PATH = "diagrams/current.json";

export const NODE_TYPES = [
  "service",
  "database",
  "component",
  "queue",
  "cache",
  "external",
  "group",
] as const;

export const EDGE_TYPES = [
  "http",
  "websocket",
  "event",
  "dependency",
  "data-flow",
] as const;

export const NODE_STATUSES = ["planned", "existing", "deprecated"] as const;

export const STATUS_COLORS: Record<
  (typeof NODE_STATUSES)[number],
  { border: string; badge: string }
> = {
  planned: { border: "#6366f1", badge: "bg-indigo-500/20 text-indigo-300" },
  existing: { border: "#22c55e", badge: "bg-green-500/20 text-green-300" },
  deprecated: { border: "#ef4444", badge: "bg-red-500/20 text-red-300" },
};

export const NODE_DIMENSIONS = { width: 220, height: 110 };

export const CANVAS_CONFIG = {
  minZoom: 0.1,
  maxZoom: 2,
  defaultZoom: 1,
  snapGrid: [16, 16] as [number, number],
  persistDebounceMs: 300,
  sseReconnectBaseMs: 1000,
  sseReconnectMaxMs: 10000,
  localWriteIgnoreMs: 2000,
};
