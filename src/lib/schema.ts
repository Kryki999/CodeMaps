import { z } from "zod";
import {
  DIAGRAM_VERSION,
  NODE_TYPES,
  EDGE_TYPES,
  NODE_STATUSES,
  NODE_HEALTHS,
  ROOT_PARENT_KEY,
} from "./constants";

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(4),
});

export const NodeDataSchema = z.object({
  tech: z.array(z.string()).optional(),
  purpose: z.string().optional(),
  rationale: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(NODE_STATUSES).optional(),
  health: z.enum(NODE_HEALTHS).optional(),
  codeRef: z.string().nullable().optional(),
  exports: z.array(z.string()).optional(),
  deps: z.array(z.string()).optional(),
  depthHint: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export const DiagramNodeSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Node id must be kebab-case"),
  type: z.enum(NODE_TYPES),
  label: z.string().min(1),
  parentId: z.string().nullable().optional(),
  position: PositionSchema.optional(),
  data: NodeDataSchema.optional(),
});

export const DiagramEdgeSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Edge id must be kebab-case"),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(EDGE_TYPES).optional(),
  label: z.string().optional(),
  animated: z.boolean().optional(),
  dashed: z.boolean().optional(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const DiagramMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DiagramSchema = z
  .object({
    $schema: z.string().optional(),
    version: z.string(),
    metadata: DiagramMetadataSchema,
    viewport: ViewportSchema,
    viewportsByParent: z.record(z.string(), ViewportSchema).optional(),
    nodes: z.array(DiagramNodeSchema),
    edges: z.array(DiagramEdgeSchema),
  })
  .superRefine((diagram, ctx) => {
    const nodeIds = new Set<string>();
    for (const node of diagram.nodes) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate node id: ${node.id}`,
          path: ["nodes"],
        });
      }
      nodeIds.add(node.id);
    }

    for (const node of diagram.nodes) {
      if (node.parentId == null || node.parentId === "") continue;
      if (node.parentId === node.id) {
        ctx.addIssue({
          code: "custom",
          message: `Node '${node.id}' cannot be its own parent`,
          path: ["nodes"],
        });
        continue;
      }
      if (!nodeIds.has(node.parentId)) {
        ctx.addIssue({
          code: "custom",
          message: `Node '${node.id}' references unknown parent '${node.parentId}'`,
          path: ["nodes"],
        });
      }
    }

    // Detect parent cycles
    const parentMap = new Map(
      diagram.nodes.map((n) => [n.id, n.parentId ?? null] as const),
    );
    for (const node of diagram.nodes) {
      const seen = new Set<string>();
      let current: string | null = node.id;
      while (current) {
        if (seen.has(current)) {
          ctx.addIssue({
            code: "custom",
            message: `Parent cycle detected involving node '${node.id}'`,
            path: ["nodes"],
          });
          break;
        }
        seen.add(current);
        current = parentMap.get(current) ?? null;
      }
    }

    const edgeIds = new Set<string>();
    for (const edge of diagram.edges) {
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate edge id: ${edge.id}`,
          path: ["edges"],
        });
      }
      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge '${edge.id}' references unknown source node '${edge.source}'`,
          path: ["edges"],
        });
      }
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: "custom",
          message: `Edge '${edge.id}' references unknown target node '${edge.target}'`,
          path: ["edges"],
        });
      }
    }
  });

export function createEmptyDiagram(name = "Nowy projekt"): z.infer<typeof DiagramSchema> {
  const now = new Date().toISOString();
  const viewport = { x: 0, y: 0, zoom: 1 };
  return {
    version: DIAGRAM_VERSION,
    metadata: {
      name,
      description: "",
      createdAt: now,
      updatedAt: now,
    },
    viewport,
    viewportsByParent: { [ROOT_PARENT_KEY]: viewport },
    nodes: [],
    edges: [],
  };
}

export function validateDiagram(data: unknown) {
  return DiagramSchema.safeParse(data);
}

export function parseDiagram(data: unknown) {
  return DiagramSchema.parse(data);
}

export function formatValidationError(data: unknown): string | null {
  const result = validateDiagram(data);
  if (result.success) return null;
  return result.error.issues.map((i) => i.message).join("; ");
}

export type ValidatedDiagram = z.infer<typeof DiagramSchema>;
