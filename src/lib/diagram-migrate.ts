import { DIAGRAM_VERSION, ROOT_PARENT_KEY } from "./constants";
import { validateDiagram, type ValidatedDiagram } from "./schema";
import type { DiagramNode, NodeHealth, NodeStatus, Viewport } from "@/types/diagram";

/** Normalize legacy 1.0 diagrams and fill Phase 2 defaults. Safe for client + server. */
export function migrateDiagram(data: unknown): ValidatedDiagram {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid diagram: expected object");
  }

  const raw = data as Record<string, unknown>;
  const nodes = Array.isArray(raw.nodes)
    ? (raw.nodes as Record<string, unknown>[]).map(migrateNode)
    : [];

  const viewport =
    raw.viewport && typeof raw.viewport === "object"
      ? (raw.viewport as Viewport)
      : { x: 0, y: 0, zoom: 1 };

  let viewportsByParent =
    raw.viewportsByParent && typeof raw.viewportsByParent === "object"
      ? ({ ...(raw.viewportsByParent as Record<string, Viewport>) } as Record<
          string,
          Viewport
        >)
      : undefined;

  if (!viewportsByParent) {
    viewportsByParent = { [ROOT_PARENT_KEY]: viewport };
  } else if (!viewportsByParent[ROOT_PARENT_KEY]) {
    viewportsByParent = { ...viewportsByParent, [ROOT_PARENT_KEY]: viewport };
  }

  const migrated = {
    ...raw,
    version: DIAGRAM_VERSION,
    viewport,
    viewportsByParent,
    nodes,
    edges: Array.isArray(raw.edges) ? raw.edges : [],
  };

  const result = validateDiagram(migrated);
  if (result.success) return result.data;

  throw new Error(
    `Invalid diagram: ${result.error.issues.map((i) => i.message).join("; ")}`,
  );
}

function migrateNode(node: Record<string, unknown>): DiagramNode {
  const data =
    node.data && typeof node.data === "object"
      ? (node.data as Record<string, unknown>)
      : {};

  return {
    id: String(node.id),
    type: node.type as DiagramNode["type"],
    label: String(node.label),
    parentId:
      node.parentId === undefined || node.parentId === ""
        ? null
        : (node.parentId as string | null),
    position: node.position as DiagramNode["position"],
    data: {
      tech: data.tech as string[] | undefined,
      purpose: data.purpose as string | undefined,
      description: data.description as string | undefined,
      status: data.status as NodeStatus | undefined,
      health: normalizeHealth(data.health),
      codeRef: (data.codeRef as string | null | undefined) ?? null,
      exports: data.exports as string[] | undefined,
      deps: data.deps as string[] | undefined,
      depthHint: data.depthHint as 1 | 2 | 3 | undefined,
    },
  };
}

function normalizeHealth(value: unknown): NodeHealth {
  if (value === "stable" || value === "warning" || value === "critical") {
    return value;
  }
  return "stable";
}
