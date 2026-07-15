import { z } from "zod";
import { DIAGRAM_VERSION, NODE_TYPES, EDGE_TYPES, NODE_STATUSES } from "./constants";

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
  description: z.string().optional(),
  status: z.enum(NODE_STATUSES).optional(),
  codeRef: z.string().nullable().optional(),
});

export const DiagramNodeSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Node id must be kebab-case"),
  type: z.enum(NODE_TYPES),
  label: z.string().min(1),
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
  return {
    version: DIAGRAM_VERSION,
    metadata: {
      name,
      description: "",
      createdAt: now,
      updatedAt: now,
    },
    viewport: { x: 0, y: 0, zoom: 1 },
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
