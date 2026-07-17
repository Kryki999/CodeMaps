import { sliceDiagram } from "@/lib/hierarchy";
import type { Diagram, DiagramEdge, DiagramNode, StackProfile } from "@/types/diagram";

function list(items: string[] | undefined): string {
  if (!items || items.length === 0) return "—";
  return items.join(", ");
}

function nodeLine(node: DiagramNode): string {
  const d = node.data;
  return [
    `- **${node.id}** (${node.type}) — ${node.label}`,
    d?.purpose ? `  - po co: ${d.purpose}` : null,
    d?.rationale ? `  - dlaczego: ${d.rationale}` : null,
    d?.description ? `  - tech: ${d.description}` : null,
    d?.tech?.length ? `  - stack: ${list(d.tech)}` : null,
    d?.codeRef ? `  - codeRef: ${d.codeRef}` : null,
    d?.status ? `  - status: ${d.status}` : null,
    d?.health ? `  - health: ${d.health}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function edgeLine(
  edge: DiagramEdge,
  byId: Map<string, DiagramNode>,
): string {
  const src = byId.get(edge.source);
  const tgt = byId.get(edge.target);
  const srcLabel = src ? `${src.label} (${edge.source})` : edge.source;
  const tgtLabel = tgt ? `${tgt.label} (${edge.target})` : edge.target;
  const kind = edge.type ?? "dependency";
  const label = edge.label ? ` — ${edge.label}` : "";
  return `- ${srcLabel} → ${tgtLabel} [${kind}]${label}`;
}

function stackInstructions(profile: StackProfile): string {
  if (profile === "react-native") {
    return [
      "## Stack: React Native / Expo",
      "- Scaffold w konwencji mobile: `src/features/...` lub Expo Router `app/`.",
      "- **Nie** twórz `app/api/...` w projekcie mobile — API to osobny węzeł/backend na mapie.",
      "- Auth / płatności: natywne SDK + env; integruj z istniejącymi sąsiadami z mapy, nie duplikuj.",
      "- Preferuj TypeScript. Dopasuj strukturę do istniejącego repo (Expo vs bare RN).",
    ].join("\n");
  }

  return [
    "## Stack: Next.js App Router (TypeScript)",
    "- UI: `app/.../page.tsx`, komponenty w obok / `components/` / `features/`.",
    "- API: `app/api/.../route.ts` gdy węzeł to endpoint / backend w tym samym repo.",
    "- Shared: `lib/...`. DB: Prisma/Drizzle w tym repo jeśli jest węzeł database.",
    "- Węzły `external` (Stripe, CMS…): klient SDK + zmienne env, bez fałszywego „własnego serwera”.",
    "- Integruj z sąsiadami z mapy (Auth, DB…) — nie implementuj ich od zera, jeśli już istnieją.",
  ].join("\n");
}

/**
 * Edges that touch the focus node (or any slice node) — includes cross-level neighbors.
 */
function collectRelevantEdges(
  diagram: Diagram,
  sliceNodeIds: Set<string>,
  focusId: string,
): { edges: DiagramEdge[]; neighborIds: Set<string> } {
  const neighborIds = new Set<string>();
  const edges: DiagramEdge[] = [];

  for (const edge of diagram.edges) {
    const srcIn = sliceNodeIds.has(edge.source);
    const tgtIn = sliceNodeIds.has(edge.target);
    const touchesFocus = edge.source === focusId || edge.target === focusId;
    const touchesSlice = srcIn || tgtIn;

    if (!touchesFocus && !touchesSlice) continue;
    // Prefer edges involving focus, or both ends in slice (already in sliceDiagram)
    if (touchesFocus || (srcIn && tgtIn)) {
      edges.push(edge);
      if (!sliceNodeIds.has(edge.source)) neighborIds.add(edge.source);
      if (!sliceNodeIds.has(edge.target)) neighborIds.add(edge.target);
    }
  }

  return { edges, neighborIds };
}

export function buildAgentPrompt(
  diagram: Diagram,
  nodeId: string,
  stackProfile: StackProfile = "next",
): string {
  const slice = sliceDiagram(diagram, nodeId);
  if (!slice.focus) {
    return `Nie znaleziono węzła o id "${nodeId}" na mapie CodeMaps.`;
  }

  const focus = slice.focus;
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const sliceIds = new Set(slice.nodes.map((n) => n.id));
  const { edges, neighborIds } = collectRelevantEdges(diagram, sliceIds, focus.id);

  // Merge unique edges (slice edges + focus-touching)
  const edgeById = new Map<string, DiagramEdge>();
  for (const e of slice.edges) edgeById.set(e.id, e);
  for (const e of edges) edgeById.set(e.id, e);
  const allEdges = [...edgeById.values()];

  const parent =
    focus.parentId != null ? byId.get(focus.parentId) ?? null : null;
  const children = slice.nodes.filter((n) => n.id !== focus.id);
  const neighbors = [...neighborIds]
    .map((id) => byId.get(id))
    .filter((n): n is DiagramNode => Boolean(n));

  const tech = focus.data?.tech ?? [];
  const techLower = tech.map((t) => t.toLowerCase()).join(" ");
  const looksRn = /react-native|\bexpo\b/.test(techLower);
  const profileWarning =
    looksRn && stackProfile === "next"
      ? "\n> Uwaga: tech węzła sugeruje React Native, a stackProfile = next. Trzymaj się profilu z config (next), chyba że użytkownik każe inaczej.\n"
      : "";

  const d = focus.data;

  const outOfScopeIds = diagram.nodes
    .filter((n) => n.id !== focus.id && !sliceIds.has(n.id) && !neighborIds.has(n.id))
    .map((n) => n.id);

  const neighborIdList =
    neighbors.length > 0
      ? neighbors.map((n) => `\`${n.id}\``).join(", ")
      : "(brak)";
  const childIdList =
    children.length > 0
      ? children.map((n) => `\`${n.id}\``).join(", ")
      : "(brak)";

  const sections = [
    `# CodeMaps — Scaffold z mapy (Faza 3)`,
    ``,
    `Zaimplementuj / rozwiń **tylko ten fragment** systemu w mapowanym repozytorium.`,
    `Źródło prawdy struktury: \`.codemaps/architecture.json\`. Nie używaj Mermaid jako mapy.`,
    profileWarning,
    `## Zakres pracy (obowiązkowy)`,
    `- **W zakresie:** fokus \`${focus.id}\`${children.length > 0 ? ` oraz jego dzieci: ${childIdList}` : ""}.`,
    `- **Sąsiedzi (tylko integracja, nie reimplementacja):** ${neighborIdList}.`,
    `- **Poza zakresem:** nie refaktoruj / nie „ulepszaj” innych modułów z mapy, chyba że użytkownik explicite poprosi.`,
    outOfScopeIds.length > 0
      ? `- Przykłady id poza slice (nie ruszaj bez prośby): ${outOfScopeIds
          .slice(0, 12)
          .map((id) => `\`${id}\``)
          .join(", ")}${outOfScopeIds.length > 12 ? ", …" : ""}.`
      : null,
    `- Mała zmiana UI/copy/CSS **bez** zmiany odpowiedzialności → kod OK, mapa: \`codemaps: no arch change\`.`,
    ``,
    `## Fokus`,
    `- id: \`${focus.id}\``,
    `- label: ${focus.label}`,
    `- type: ${focus.type}`,
    `- purpose (po co to jest, prostym językiem): ${d?.purpose?.trim() || "—"}`,
    `- rationale (dlaczego / intencja / trade-offy — pamięć projektu):`,
    d?.rationale?.trim()
      ? d.rationale
          .trim()
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n")
      : "  —",
    `- description (notatki techniczne): ${d?.description?.trim() || "—"}`,
    `- tech: ${list(d?.tech)}`,
    `- deps: ${list(d?.deps)}`,
    `- exports: ${list(d?.exports)}`,
    `- codeRef: ${d?.codeRef ?? "— (ustaw po scaffoldzie)"}`,
    `- status: ${d?.status ?? "planned"}`,
    `- health: ${d?.health ?? "stable"}`,
    `- depthHint: ${d?.depthHint ?? "—"}`,
    `- parentId: ${focus.parentId ?? "null (root)"}`,
    parent ? `- parent: ${parent.label} (\`${parent.id}\`)` : null,
    ``,
    `## Dzieci (Level niżej)`,
    children.length > 0 ? children.map(nodeLine).join("\n") : "- (brak)",
    ``,
    `## Sąsiedzi / zależności (krawędzie)`,
    allEdges.length > 0
      ? allEdges.map((e) => edgeLine(e, byId)).join("\n")
      : "- (brak krawędzi)",
    neighbors.length > 0
      ? `\n### Węzły poza slice (przez krawędzie)\n${neighbors.map(nodeLine).join("\n")}`
      : null,
    ``,
    stackInstructions(stackProfile),
    ``,
    `## Checklist po zmianie (obowiązkowa)`,
    `1. Kod w projectRoot mapowanego projektu — w zakresie fokusu.`,
    `2. Mapa \`.codemaps/architecture.json\` w **tym samym** change set, **albo** jawne \`codemaps: no arch change\` gdy architektura się nie zmieniła.`,
    `3. Jeśli mapa się zmienia, sprawdź:`,
    `   - [ ] \`codeRef\` wskazuje realną ścieżkę`,
    `   - [ ] \`status\` (\`existing\` gdy kod jest; \`planned\` / \`deprecated\` wg stanu)`,
    `   - [ ] \`purpose\` (prosty język) aktualne względem zachowania`,
    `   - [ ] \`rationale\` (dlaczego tak: intencja, UX/biznes, trade-offy) — uzupełnij przy decyzjach produktowych; nie zmyślaj przy brownfield`,
    `   - [ ] \`description\` (notatki tech) — mock vs real, ograniczenia`,
    `   - [ ] \`exports\` / \`deps\` jeśli publiczne API / biblioteki się zmieniły`,
    `   - [ ] \`health\` — \`critical\` przy znalezionym bugu w codeRef; po fixie \`stable\`/\`warning\``,
    `4. Nie zmieniaj \`position\` istniejących węzłów bez prośby.`,
    `5. Nie duplikuj sąsiadów z mapy — integruj.`,
    `6. Skill: CodeMaps Flow D + docs/SYNC.md. Przy większym tasku rozważ Flow E (drift) przed kodem.`,
    ``,
    `## Twoje dodatkowe wymagania użytkownika`,
    `(użytkownik może dopisać poniżej po wklejeniu promptu)`,
    ``,
  ];

  return sections.filter((line) => line !== null).join("\n");
}
