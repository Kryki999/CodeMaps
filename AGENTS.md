# CodeMaps — Agent Instructions

CodeMaps is a Cursor-driven diagram workspace. The application has **no built-in AI chat**. You (the Cursor agent) control the diagram by editing a local JSON file.

## How to think (skill)

For **workflows** (greenfield / brownfield / patch / scaffold) and **first-time orientation**, follow the project skill:

- [`.cursor/skills/codemaps-architect/SKILL.md`](.cursor/skills/codemaps-architect/SKILL.md) — start with **First Contact** if new to CodeMaps in this session

This file (`AGENTS.md`) is the **format contract** (schema, fields, validation). The skill is the **process** + onboarding.

## Source of Truth

- **Active diagram file:** `.codemaps/architecture.json` (inside the mapped project root)
- **App config:** `.codemaps/config.json` — `{ "projectRoot": ".", "diagramRelativePath": ".codemaps/architecture.json", "stackProfile": "next" }`
- **Env override:** `CODEMAPS_PROJECT_ROOT` points at an external repo (e.g. Clubify)
- **JSON Schema:** `diagram.schema.json` (use for validation and autocomplete)
- **Example diagram:** `diagrams/examples/monolith-split.json`

Legacy path `diagrams/current.json` is deprecated — always edit `.codemaps/architecture.json`.

When the user asks you to draw, update, or modify an architecture diagram, **edit `.codemaps/architecture.json` directly**. The Next.js app watches this file and hot-reloads the canvas via SSE.

## Diagram Structure (v1.1 — C4 nesting)

```json
{
  "version": "1.1",
  "metadata": { "name": "...", "description": "...", "createdAt": "...", "updatedAt": "..." },
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "viewportsByParent": { "__root__": { "x": 0, "y": 0, "zoom": 1 } },
  "nodes": [...],
  "edges": [...]
}
```

Nodes are a **flat list** with optional `parentId` (not a nested tree). This keeps Git diffs and agent patches simple.

## Node Rules

1. **IDs must be unique kebab-case** (e.g. `frontend`, `auth-service`, `user-db`)
2. **Types:** `service`, `database`, `component`, `queue`, `cache`, `external`, `group`
3. **`parentId`:** `null` / omitted = root (C4 level 1). Set to parent node id for nesting (level 2/3)
4. **New nodes:** Omit `position` — the app auto-layouts them with Dagre **within that parent level**
5. **Existing nodes:** Do NOT change `position` unless the user explicitly asks to rearrange
6. **`data.status` (lifecycle):** `planned` | `existing` | `deprecated`
7. **`data.health` (stability):** `stable` | `warning` | `critical` — flag `critical` when you find a bug in `codeRef`
8. **`data.tech`:** technology badges
9. **`data.purpose`:** plain-language “po co to jest / za co odpowiada” (non-technical)
10. **`data.description`:** technical notes for developers and agents
11. **`data.deps` / `data.exports`:** living documentation (libraries, key functions/types)
12. **`data.codeRef`:** path to source file/folder
13. **`data.depthHint`:** optional `1` | `2` | `3` C4 hint for agents

## Edge Rules

1. **IDs must be unique kebab-case**
2. **source/target** must reference existing node IDs (any depth)
3. **Types:** `http`, `websocket`, `event`, `dependency`, `data-flow`
4. **animated:** `true` for streaming/event connections
5. Canvas shows only edges whose **both** ends are on the current parent level

## Token Optimization — Context Slice

Do **not** dump the entire architecture into context when working on one area.

**Procedure:**

1. Identify the focus node id (e.g. `auth-ui`)
2. Load that node + its **direct children** + edges among that set
3. Optionally call `GET /api/diagram/slice?nodeId=auth-ui` while the app is running
4. For root overview: `nodeId` omitted or `null` → root-level nodes only

## Atomic Commits (Architecture as Code)

When implementing a feature:

1. Change application code (`.tsx`, `.ts`, …)
2. Update `.codemaps/architecture.json` in the **same** change set
3. Prefer **one Git commit** covering both — so `git revert` restores map + code together

### Sync discipline (mapa nie gnije)

Full playbook: [`docs/SYNC.md`](docs/SYNC.md)

- **DoD:** feature/fix includes map update OR explicit `codemaps: no arch change`
- Bug found → `health: critical`; fixed → `stable`
- Removed module → delete node+edges or `status: deprecated`
- Optional CI/pre-commit: `npm run check:codemaps-sync` (requires `syncGlobs` in config)

## Common User Commands → Actions

| User says | You do |
|-----------|--------|
| "Rozbij monolit na frontend i backend" | Add root `frontend` + `backend`, connect with `http` edge |
| "Dodaj bazę danych PostgreSQL" | Add root `database` node, connect from backend with `data-flow` |
| "Dodaj moduł Auth we Frontendzie" | Add node with `parentId: "frontend"`, type `group`/`component` |
| "Wejdź w Auth i dodaj handleLogin" | Add child with `parentId: "auth-ui"`, set `exports` / `codeRef` |
| "Oflaguj błąd w auth" | Set `data.health: "critical"` on the node |
| "Usuń Redis" | Remove node + all edges referencing it |
| "Zajrzyj w schemat i wygeneruj kod" / wklejony prompt z kafelka | Flow D: scaffold wg `stackProfile` + sync mapy |
| "Dodaj feature X — najpierw na mapę, potem kod" | Flow C (kafelek) → Flow D (implementacja) |
| "Sprawdź drift / czy mapa zgadza się z kodem" | Flow E: `npm run check:codemaps-drift` lub UI Drift → Flow C |

## Phase 3 — Diagram → code

- UI: expand kafelek → **Prompt dla agenta** (kopiuje slice + instrukcje stacku do schowka)
- Config: `stackProfile` w `.codemaps/config.json` — `next` (default) | `react-native`
- Agent: ten skill, **Flow D**
- Kod pisze Cursor; CodeMaps nie ma wbudowanego LLM

## Phase 4 — Drift (code vs map)

- **Read-only** report — never auto-writes the map
- CLI: `npm run check:codemaps-drift` (`--json`, `CODEMAPS_DRIFT_ALLOW=1`)
- API: `GET /api/diagram/drift`
- UI: toolbar **Drift**
- Findings: `missing_on_map`, `broken_codeRef`, `missing_codeRef`
- Agent: **Flow E** then patch with Flow C

## Validation Checklist

Before saving, verify:
- [ ] All node IDs are unique kebab-case
- [ ] All edge IDs are unique kebab-case
- [ ] Every `edge.source` / `edge.target` / `node.parentId` exists
- [ ] No parent cycles
- [ ] `metadata.updatedAt` is current ISO timestamp
- [ ] `version` is `"1.1"`

## Example: Nested Auth Module

```json
{
  "id": "auth-ui",
  "type": "group",
  "label": "Auth",
  "parentId": "frontend",
  "data": {
    "tech": ["React"],
    "purpose": "Logowanie i wejście użytkownika do aplikacji — formularz, błędy, przejście do panelu.",
    "description": "Ekrany i flow logowania; LoginForm + submit handler",
    "status": "planned",
    "health": "stable",
    "exports": ["LoginForm"],
    "depthHint": 2
  }
}
```

Note: no `position` field — auto-layout handles placement on that level.

## Hot Reload

After you save `.codemaps/architecture.json`, the running dev server (`npm run dev`) pushes the update to the browser within ~100ms. No need to restart the app.

## Project Phases

- **Faza 1 (done):** Canvas, SSE hot-reload, inline expanding tiles, basic nodes/edges
- **Faza 2 (done):** C4 nesting (`parentId`), living docs in tiles, dual status/health, Architecture as Code (`.codemaps/`), agent context slices
- **Faza 3 (done):** Diagram → code — prompt z kafelka + Flow D (Next / React Native)
- **Faza 4 (current MVP):** Code → map awareness — drift report only (CLI / API / UI); agent patches via Flow E+C
