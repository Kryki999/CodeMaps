import { NODE_TYPES, EDGE_TYPES, NODE_STATUSES } from "@/lib/constants";

export type NodeType = (typeof NODE_TYPES)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];
export type NodeStatus = (typeof NODE_STATUSES)[number];

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
  description?: string;
  status?: NodeStatus;
  codeRef?: string | null;
}

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  position?: Position;
  data?: NodeData;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type?: EdgeType;
  label?: string;
  animated?: boolean;
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
  viewport: Viewport;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}
