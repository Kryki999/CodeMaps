# CodeMaps

**Architecture as Code for AI-assisted building.**

A visual command center for your app — like Excalidraw, except the main “drawer” is a **Cursor agent**. You correct by hand; the map lives in Git next to the code.

> Honest take: CodeMaps shines on larger systems (Next.js + API + DB + payments + CMS) when the map is updated **with** the code. Treat it as decoration and it rots like any stale doc.

**Map = structure & intent. Code = implementation.**

---

## Why it exists

- See **what connects to what** at a glance  
- Spot fires fast (`health: critical`)  
- Give agents a **scoped slice** of architecture — not the whole repo dump  
- Keep **living docs on tiles**: what / why / tech notes — not forgotten markdown  

Coding agents are getting great at *how*. They still need precise *why*. CodeMaps stores that next to the structure.

---

## Features (MVP)

| Area | What you get |
|------|----------------|
| **Canvas** | Drag nodes, edges, SSE hot-reload, double-click expand tiles |
| **C4 nesting** | Flat JSON + `parentId`, breadcrumbs, drill-down |
| **Living docs** | `purpose` · `rationale` (why/intent) · `description` (tech) · `status` + `health` |
| **Agent loop** | Cursor skill + tile **Prompt for agent** → scaffold in your repo |
| **Drift** | Report: code paths vs `codeRef` (CLI / API / UI) — no auto-write |
| **Project picker** | Point CodeMaps at any local project folder |

Stack profiles: `next` | `react-native`.

---

## Quick start

```bash
npm install
npm run dev
```

Open the app (Next.js). Default map:

- Diagram: [`.codemaps/architecture.json`](.codemaps/architecture.json)  
- Config: [`.codemaps/config.json`](.codemaps/config.json) — `projectRoot`, `diagramRelativePath`, `stackProfile`  
- Env override: `CODEMAPS_PROJECT_ROOT` → absolute path to an external repo  

In the UI: **Project** → pick folder (**Browse…**) or paste a path → Save → reload.

---

## C4 levels

| Level | What | Example |
|-------|------|---------|
| **1** | System containers (`parentId: null`) | Frontend, Backend, Postgres, CMS |
| **2** | Modules inside a container | Auth, Checkout, Dashboard |
| **3** | Critical functions only | `handleLogin`, `createPayment` |

Double-click = edit tile · **Enter** = drill down · breadcrumbs = go up.  
Don’t map every function at Level 3 — maintenance dies.

### Tile fields (living docs)

| Field | Role |
|-------|------|
| **purpose** | Plain language: what it is / who it’s for |
| **rationale** | Why this approach — intent, UX/business, trade-offs (project memory for humans & new agents) |
| **description** | Technical notes — mocks vs real, constraints |
| **status** | `planned` \| `existing` \| `deprecated` |
| **health** | `stable` \| `warning` \| `critical` |
| **codeRef** | Path into the mapped repo |

---

## Human guide (short)

CodeMaps = browser board + **Cursor** agent. No in-app AI chat.

| Action | Result |
|--------|--------|
| Drag tile | Move (persisted) |
| Connect handles | New edge |
| Double-click | Edit purpose / rationale / tech / deps / exports / codeRef / status / health |
| **Enter** (has children) | Drill down |
| **Drift** | Code ↔ map report (read-only) |
| **Project** | `projectRoot` + `stackProfile` |

**Typical flows**

1. **Existing code → map** — paste the [onboarding prompt](#prompt-add-codemaps-to-a-project) in Cursor on that repo → point CodeMaps UI at the folder → Drift  
2. **Idea → map → code** — greenfield prompt or draw tiles → tile **Prompt for agent** → implement  
3. **Small change** — chat in Cursor; map update only if architecture changed (`codemaps: no arch change` otherwise)

---

## Prompt: add CodeMaps to a project

Copy into Cursor on the **target repo**. Keep the CodeMaps app running separately and set `projectRoot` to that folder.

### Brownfield (recommended)

```text
Enable CodeMaps on this project (brownfield / Flow B).

Tool context:
- Source of truth for the map = `.codemaps/architecture.json` in THIS repo.
- Do not use Mermaid/PlantUML as the map — CodeMaps JSON only (version "1.1", flat nodes + parentId).
- Follow skill codemaps-architect + AGENTS.md if available.

Do this in order:
1. Create `.codemaps/` if missing.
2. Create `.codemaps/config.json`:
   - "projectRoot": "."
   - "diagramRelativePath": ".codemaps/architecture.json"
   - "stackProfile": "next" OR "react-native"
   - "syncGlobs": sensible app globs (e.g. ["app/**", "src/**", "components/**", "lib/**"])
3. Light scan (manifests, app/, features/, API, DB, external SDKs) — do not map every file.
4. Write `.codemaps/architecture.json`:
   - Level 1: containers / runtime / external (parentId: null)
   - Level 2: major modules that matter
   - Level 3: ONLY if asked or for a critical hot path
   - Existing code: status "existing" + real codeRef
   - Planned / stubs: status "planned"; health "warning" if mock/scaffold
   - On sensible tiles (esp. L1–L2):
     - purpose = plain language what/for whom
     - rationale = why (intent, UX/business, trade-offs) only if known — do not invent
     - description = technical notes
   - Real edges only (http, data-flow, dependency, …)
5. Validate: unique kebab-case ids, valid parentId/edges, metadata.updatedAt = now.
6. Summarize: what you mapped, file path, stackProfile, planned/warning nodes.

Then human: CodeMaps UI → Project → select this folder → Save → Drift.
```

### Greenfield

```text
Draw a CodeMaps architecture from a concept (greenfield / Flow A).

- Write `.codemaps/architecture.json` (+ config as above) in the target project.
- Level 1 only at first. Level 2 only if asked.
- status: planned; purpose + rationale (if user said why) + short description + tech.
- No Mermaid as SSOT. No deep Level 3 trees.
- After the map: propose next step (drill one container OR scaffold from a tile).
```

### Follow-ups

```text
Run CodeMaps drift (Flow E) and patch the map from findings — no full remap.
```

```text
Focus tile <id>, implement <feature>; stay in slice; update the map in the same change set (or say codemaps: no arch change).
```

---

## Diagram → code (Phase 3)

CodeMaps does **not** generate code by itself. It packs context for Cursor.

1. Double-click tile → **Prompt for agent**  
2. Paste into Cursor (+ your requirements)  
3. Agent implements in `projectRoot` and updates `.codemaps/architecture.json`

`stackProfile`: `next` (App Router) or `react-native` (Expo/RN — no mobile `app/api`).

---

## Drift (Phase 4)

Compares files under `projectRoot` to `codeRef` on the map.

```bash
npm run check:codemaps-drift
npm run check:codemaps-drift -- --json
```

- UI: **Drift** · API: `GET /api/diagram/drift`  
- Does **not** write the map — you or the agent (Flow E) patch JSON  
- Findings: `missing_on_map`, `broken_codeRef`, `missing_codeRef`  

Separate from `npm run check:codemaps-sync` (CI guard: code changed under `syncGlobs` but map didn’t). See [`docs/SYNC.md`](docs/SYNC.md).

---

## Agent files (Cursor)

| File | Role |
|------|------|
| [`AGENTS.md`](AGENTS.md) | JSON contract |
| [`.cursor/skills/codemaps-architect/SKILL.md`](.cursor/skills/codemaps-architect/SKILL.md) | Flows A–E + First Contact |
| [`.cursor/rules/diagram-editing.mdc`](.cursor/rules/diagram-editing.mdc) | Rule trigger |
| [`docs/SYNC.md`](docs/SYNC.md) | Keep map ↔ code honest |

---

## Sync discipline (critical)

1. Architecture change = code + `.codemaps/architecture.json` in the **same** change set  
2. Done = feature works **and** map matches (or explicit `codemaps: no arch change`)  
3. Capture product “why” in `rationale` — don’t leave it only in chat  
4. Optional CI: `npm run check:codemaps-sync`  

---

## Stack

Next.js 16 · React 19 · React Flow · Zustand · Zod · Dagre · Chokidar (SSE)

## Status

Active MVP (post Phase 2). Schema `1.1` may evolve before 1.0.

## License

MIT — see [LICENSE](LICENSE).
