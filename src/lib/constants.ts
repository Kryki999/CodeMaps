export const DIAGRAM_VERSION = "1.1" as const;

/** Default relative path to architecture map inside a project root. */
export const DEFAULT_DIAGRAM_RELATIVE_PATH = ".codemaps/architecture.json";

/** App-side config that points at the mapped project. */
export const CODEMAPS_CONFIG_PATH = ".codemaps/config.json";

/** Viewport / filter key for the root (no parent) level. */
export const ROOT_PARENT_KEY = "__root__";

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

export const NODE_HEALTHS = ["stable", "warning", "critical"] as const;

export const STACK_PROFILES = ["next", "react-native"] as const;

export const STATUS_COLORS: Record<
  (typeof NODE_STATUSES)[number],
  { border: string; badge: string }
> = {
  planned: { border: "#6366f1", badge: "bg-indigo-500/20 text-indigo-300" },
  existing: { border: "#22c55e", badge: "bg-green-500/20 text-green-300" },
  deprecated: { border: "#ef4444", badge: "bg-red-500/20 text-red-300" },
};

export const HEALTH_COLORS: Record<
  (typeof NODE_HEALTHS)[number],
  { dot: string; glow: string; label: string }
> = {
  stable: { dot: "#22c55e", glow: "shadow-green-500/50", label: "Stabilne" },
  warning: { dot: "#f59e0b", glow: "shadow-amber-500/50", label: "W budowie" },
  critical: { dot: "#ef4444", glow: "shadow-red-500/60", label: "Błąd krytyczny" },
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
