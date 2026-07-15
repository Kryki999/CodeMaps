import type { Diagram } from "@/types/diagram";

export async function saveDiagramToApi(diagram: Diagram): Promise<Diagram> {
  const res = await fetch("/api/diagram", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(diagram),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to save diagram");
  }

  return res.json() as Promise<Diagram>;
}
