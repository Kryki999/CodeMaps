import {
  NODE_TYPES,
  EDGE_TYPES,
  NODE_STATUSES,
  NODE_HEALTHS,
  STACK_PROFILES,
} from "@/lib/constants";

export type NodeType = (typeof NODE_TYPES)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];
export type NodeStatus = (typeof NODE_STATUSES)[number];
export type NodeHealth = (typeof NODE_HEALTHS)[number];
export type StackProfile = (typeof STACK_PROFILES)[number];

export interface Position {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface NodeData {
  tech?: string[];
  /**
   * Plain-language “what is this for” — readable by non-engineers.
   * Shown on the collapsed tile; agents use it for intent.
   */
  purpose?: string;
  /** Technical notes — constraints, implementation reality, agent/dev hints. */
  description?: string;
  status?: NodeStatus;
  health?: NodeHealth;
  codeRef?: string | null;
  exports?: string[];
  deps?: string[];
  depthHint?: 1 | 2 | 3;
}

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  /** null/undefined = root level */
  parentId?: string | null;
  position?: Position;
  data?: NodeData;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: EdgeType;
  label?: string;
  animated?: boolean;
  dashed?: boolean;
}

export interface DiagramMetadata {
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Diagram {
  $schema?: string;
  version: string;
  metadata: DiagramMetadata;
  /** Viewport for the currently relevant / last-active level (compat + persist). */
  viewport: Viewport;
  /** Per-level viewports keyed by parent id or `__root__`. */
  viewportsByParent?: Record<string, Viewport>;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface CodeMapsConfig {
  projectRoot: string;
  diagramRelativePath: string;
  /** Globs relative to projectRoot; empty = sync check skipped */
  syncGlobs?: string[];
  /** Scaffold prompt profile: Next.js App Router or React Native */
  stackProfile?: StackProfile;
}
