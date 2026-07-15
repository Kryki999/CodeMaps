# CodeMaps — Agent Instructions

CodeMaps is a Cursor-driven diagram workspace. The application has **no built-in AI chat**. You (the Cursor agent) control the diagram by editing a local JSON file.

## Source of Truth

- **Active diagram file:** `diagrams/current.json`
- **JSON Schema:** `diagram.schema.json` (use for validation and autocomplete)
- **Example diagram:** `diagrams/examples/monolith-split.json`

When the user asks you to draw, update, or modify an architecture diagram, **edit `diagrams/current.json` directly**. The Next.js app watches this file and hot-reloads the canvas via SSE.

## Diagram Structure

```json
{
  "version": "1.0",
  "metadata": { "name": "...", "description": "...", "createdAt": "...", "updatedAt": "..." },
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "nodes": [...],
  "edges": [...]
}
```

## Node Rules

1. **IDs must be unique kebab-case** (e.g. `frontend`, `auth-service`, `user-db`)
2. **Types:** `service`, `database`, `component`, `queue`, `cache`, `external`, `group`
3. **New nodes:** Omit `position` — the app auto-layouts them with Dagre
4. **Existing nodes:** Do NOT change `position` unless the user explicitly asks to rearrange
5. **data.status:** `planned` (default), `existing` (already in codebase), `deprecated`
6. **data.tech:** Array of technology names shown as badges
7. **data.codeRef:** Path to source file (for reverse-engineering phase, e.g. `"src/app/api/auth/route.ts"`)

## Edge Rules

1. **IDs must be unique kebab-case**
2. **source/target** must reference existing node IDs
3. **Types:** `http`, `websocket`, `event`, `dependency`, `data-flow`
4. **animated:** `true` for streaming/event connections

## Common User Commands → Actions

| User says | You do |
|-----------|--------|
| "Rozbij monolit na frontend i backend" | Add `frontend` + `backend` nodes, connect with `http` edge |
| "Dodaj bazę danych PostgreSQL" | Add `database` node, connect from backend with `data-flow` edge |
| "Dodaj moduł autoryzacji" | Add `component` node `auth-service`, connect from backend |
| "Połącz frontend z API" | Add edge `frontend` → `backend` type `http` |
| "Usuń Redis" | Remove node `redis` and all edges referencing it |
| "Zajrzyj w schemat i wygeneruj kod" | Read full diagram, use `data.description` + `data.tech` + edges to scaffold features |

## Validation Checklist

Before saving, verify:
- [ ] All node IDs are unique kebab-case
- [ ] All edge IDs are unique kebab-case
- [ ] Every `edge.source` and `edge.target` exists in `nodes`
- [ ] `metadata.updatedAt` is set to current ISO timestamp
- [ ] `version` is `"1.0"`

## Example: Adding a Backend Node

```json
{
  "id": "backend",
  "type": "service",
  "label": "Backend API",
  "data": {
    "tech": ["Node.js", "Express"],
    "description": "REST API and business logic",
    "status": "planned",
    "codeRef": null
  }
}
```

Note: no `position` field — auto-layout handles placement.

## Hot Reload

After you save `diagrams/current.json`, the running dev server (`npm run dev`) pushes the update to the browser within ~100ms. No need to restart the app.

## Future Phases

- **Phase 2 (diagram → code):** Read nodes + edges, generate real features based on `data.description` and `data.tech`
- **Phase 3 (code → diagram):** Scan codebase, set `data.status: "existing"` and `data.codeRef` for discovered modules
