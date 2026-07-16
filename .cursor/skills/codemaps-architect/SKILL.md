---
name: codemaps-architect
description: >-
  Builds and updates CodeMaps C4 architecture maps by editing
  `.codemaps/architecture.json` (flat nodes + parentId, living docs, dual
  status/health). Scaffolds code from map tiles (Phase 3: Next.js or React
  Native via stackProfile). On first CodeMaps contact in a session, orient
  using this skill's First Contact section. Use when the user asks to draw,
  sketch, or update an architecture diagram/schema/map; mentions CodeMaps,
  C4, nesting, drill-down, living documentation; wants a map from a concept
  (greenfield) or from an existing codebase (brownfield); pastes a CodeMaps
  agent prompt; asks to generate/scaffold code from a tile; asks how
  CodeMaps works; asks for a drift report / whether the map matches the code;
  or asks to flag health, add modules, or sync the map with code. Do not output
  Mermaid/PlantUML as the source of truth — always write CodeMaps JSON.
---

# CodeMaps Architect

You are operating **CodeMaps**: a Cursor-driven visual architecture board.
There is no in-app AI chat — **you** update the map by editing JSON.

## First Contact (new agent / new session)

If this is your first CodeMaps task in the conversation (or the user asks how it works), orient quickly — then act:

1. Skim [README.md](../../../README.md) (what / phases / Phase 3 prompt button).
2. Keep this skill as the **process** (flows A–E).
3. Use [AGENTS.md](../../../AGENTS.md) as the **JSON contract** when editing the map.
4. Use [docs/SYNC.md](../../../docs/SYNC.md) when changing code + map together.

**Mental model (do not confuse these):**

| Piece | Role |
|-------|------|
| `.codemaps/architecture.json` | Living map — source of truth for **structure** |
| This skill | How to think and which flow to run |
| Tile button **Prompt dla agenta** | Optional dense context pack for one node (paste into chat); not required if you can read the JSON slice yourself |
| **Drift** (`npm run check:codemaps-drift` / toolbar) | Read-only report: code paths vs `codeRef` — never auto-writes the map |
| Cursor chat | Where the user talks to you — CodeMaps has no built-in AI chat |
| `stackProfile` in config | `next` or `react-native` — shapes scaffold paths in Flow D |

**Correct the user gently when needed:** e.g. they ask for Mermaid as the map, skip map sync, flatten everything to one level, or treat the tile prompt as the only way to work — explain the model above and steer back.

Then continue with Non-negotiables and the matching flow.

## Non-negotiables

1. **Source of truth:** `.codemaps/architecture.json` under the mapped project root (see `.codemaps/config.json` / `CODEMAPS_PROJECT_ROOT`).
2. **Never** use legacy `diagrams/current.json` as the active map.
3. **Never** use side drawers / Mermaid / PlantUML as the map — UI reads JSON only.
4. Nodes are a **flat list** with optional `parentId` (not nested JSON trees).
5. New nodes: **omit `position`** (Dagre auto-layout per parent level).
6. Do **not** move existing node positions unless the user asks.
7. Prefer **context slices** over loading the entire map when updating one area.
8. Format contract + validation: read [AGENTS.md](../../../AGENTS.md) and [diagram.schema.json](../../../diagram.schema.json).

## How CodeMaps thinks (C4)

| Depth | What it is | Typical node types | `depthHint` |
|-------|------------|--------------------|-------------|
| 1 | System / containers | `service`, `database`, `external`, `cache` | `1` |
| 2 | Modules / folders inside a container | `group`, `component` | `2` |
| 3 | Key functions / types | `component` | `3` |

**Progressive disclosure:** start at Level 1. Only add Level 2–3 where the user needs detail. Prefer ≤12 nodes visible on one level.

**Dual metrics (independent):**

- `data.status`: lifecycle — `planned` | `existing` | `deprecated`
- `data.health`: stability — `stable` | `warning` | `critical` (use `critical` when you find a real bug in `codeRef`)

**Living docs on the tile (short):** `description`, `tech`, `deps`, `exports`, `codeRef`.

## Choose a flow

| User intent | Flow |
|-------------|------|
| Idea / PRD / “narysuj architekturę…” without code | **A — Greenfield** |
| Existing repo / “zmapuj ten projekt” | **B — Brownfield** |
| “Dodaj Auth”, “oflaguj błąd”, tweak map | **C — Update** |
| Paste CodeMaps prompt / “wygeneruj kod z kafelka” | **D — Scaffold from map** |
| “Sprawdź drift” / code vs map | **E — Drift** then **C** to patch |

---

### Flow A — Greenfield (concept → map)

1. Clarify stack only if missing (default: Next.js / React / TS / API / DB as needed).
2. Draft **Level 1 only**: main containers + real edges (`http`, `data-flow`, `dependency`…).
3. Write/replace `.codemaps/architecture.json` (`version: "1.1"`). Root nodes: `parentId: null`.
4. Fill short `description` + `tech`; `status: planned`; `health: stable` unless known risk.
5. Stop. Ask if they want to drill into a specific container (Level 2) — don’t invent deep trees unprompted.

### Flow B — Brownfield (code → map)

1. Resolve project root (config / env). Ensure `.codemaps/` exists; create `architecture.json` if missing.
2. Scan lightly: package manifests, `src/app`, `src/features`, API routes, DB clients — **not** every file.
3. Level 1 from real deployable/runtime pieces; `status: existing` + `codeRef` to folders/entrypoints.
4. Level 2 for major modules the user cares about (Auth, Dashboard, Payments…).
5. Level 3 only for critical functions when asked or when debugging.
6. Separate facts vs guesses in `description` if unsure; prefer `health: warning` over inventing structure.
7. Write JSON; validate IDs / parentIds / edges (see AGENTS checklist).

### Flow C — Update (patch existing map)

1. **Read** current `.codemaps/architecture.json` first.
2. Identify focus node id. Work on **slice**: focus + direct children + edges among them (or `GET /api/diagram/slice?nodeId=…` if app is running).
3. Patch minimally: add/remove/update nodes & edges; preserve unrelated subtrees and positions.
4. If implementing a feature in code: update code **and** the map in the **same** change set (atomic commit when user asks to commit).
5. Set `metadata.updatedAt` to now (ISO). Keep `version: "1.1"`.

### Flow D — Scaffold from map (diagram → code)

Triggered when the user pastes a **CodeMaps — Scaffold z mapy** prompt (from the tile button) or asks to implement a node.

1. Read `.codemaps/config.json` → `stackProfile` (`next` | `react-native`) and `projectRoot`.
2. Use the prompt/slice focus node: `description`, `tech`, `deps`, `exports`, edges/neighbors.
3. Implement in **projectRoot** using stack conventions:
   - **next:** App Router (`app/...`, `app/api/.../route.ts`, `lib/...`); DB in-repo if mapped; `external` = SDK + env.
   - **react-native:** features/screens (Expo `app/` or `src/features`); **no** mobile `app/api` — API is another map node; native SDKs for auth/payments.
4. Do **not** re-implement neighbor tiles (Auth, DB, Stripe) from scratch — integrate.
5. After code: patch `.codemaps/architecture.json` — set `codeRef`, `status: existing`, refresh `exports`/`deps` if needed; same change set as code.
6. Follow [docs/SYNC.md](../../../docs/SYNC.md).

User may add extra requirements under the pasted prompt — honor those.

### Flow E — Drift (code → map awareness)

1. Run drift (prefer `npm run check:codemaps-drift -- --json` or `GET /api/diagram/drift` while dev server runs). Respect `stackProfile` (next vs react-native scan roots).
2. Read findings:
   - `broken_codeRef` — fix path or remove/deprecate node
   - `missing_on_map` — add node(s) with `codeRef` (Level 1–2 only unless asked)
   - `missing_codeRef` — set `codeRef` on `existing` nodes
3. **Never** invent a full remap beside the report — patch via Flow C using findings as the checklist.
4. Drift tools **do not write** `architecture.json`; you (the agent) apply the patch deliberately.
5. Re-run drift to confirm blocking findings are gone.

## Sync with code (non-optional)

Map drift kills the product. Always:

1. Same change set: code + `.codemaps/architecture.json`
2. Bug found → `health: critical` (+ `codeRef`); fixed → `stable`
3. Deleted feature → remove node/edges or `status: deprecated`
4. If architecture truly unchanged, say so explicitly (`codemaps: no arch change`)
5. Human process + CI details: [docs/SYNC.md](../../../docs/SYNC.md)

## Quality bar

- Unique kebab-case ids for nodes and edges.
- Every `parentId` / edge endpoint exists; no parent cycles.
- Edges reflect real runtime/data dependencies — not “everything connected to everything”.
- Cross-level edges may exist in JSON; canvas shows only same-level edges — that’s OK.
- Polish language in labels/descriptions to match the user’s language (PL/EN).

## Anti-patterns

- Dumping the whole codebase into one flat canvas.
- Creating Level 3 for every function.
- Drawing Mermaid “instead of” CodeMaps.
- Changing all positions on every edit.
- Replacing `status` with `health` or vice versa.

## After editing

Confirm briefly: what changed, which level, file path. Remind that with `npm run dev` the board hot-reloads via SSE.
