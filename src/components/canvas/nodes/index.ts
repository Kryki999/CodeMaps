import { ArchitectureNode } from "./ArchitectureNode";
import type { NodeType } from "@/types/diagram";

export const nodeTypes = {
  service: ArchitectureNode,
  database: ArchitectureNode,
  component: ArchitectureNode,
  queue: ArchitectureNode,
  cache: ArchitectureNode,
  external: ArchitectureNode,
  group: ArchitectureNode,
} satisfies Record<NodeType, typeof ArchitectureNode>;

export { ArchitectureNode };
