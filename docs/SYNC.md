# Synchronizacja CodeMaps ↔ kod

Cel: mapa **nie** staje się starą dokumentacją. Żyje tylko wtedy, gdy jest częścią codziennego procesu — jak testy.

## Zasada nadrzędna

> Zmiana struktury / odpowiedzialności / zależności w kodzie  
> **⇒** ten sam PR aktualizuje `.codemaps/architecture.json`.

Git + SSE hot-reload tylko **dostarczają** plik na canvas.  
**Prawda syncu** to Wasza dyscyplina + agent + (opcjonalnie) CI guard.

---

## Dla osoby zarządzającej projektem (lead / owner)

### Definition of Done

Feature / fix jest „done” dopiero gdy:

- [ ] Kod działa
- [ ] Mapa odzwierciedla zmianę (węzeł, krawędź, `codeRef`, `health`, albo świadome „bez zmian w architekturze”)
- [ ] W PR widać diff `.codemaps/` **albo** komentarz: `codemaps: no arch change`

### Review PR

Pytania przy review:

1. Czy zmienił się flow między kontenerami / modułami?
2. Czy nowy moduł powinien mieć kafelek (Level 2)?
3. Czy po fixie zdjęto `health: critical`?
4. Czy usunięty kod ma usunięty / `deprecated` węzeł?

### Rytuał (lekki)

- **Co sprint (10–15 min):** sam Level 1 — czy kontenery i główne krawędzie nadal prawdziwe
- **Nie mapuj Level 3 wszystkiego** — tylko ścieżki krytyczne (login, płatność, webhooki)

### Onboarding nowego repo

1. Ustaw `.codemaps/config.json` → `projectRoot` na to repo (lub `CODEMAPS_PROJECT_ROOT`)
2. Ustaw `syncGlobs` na ścieżki aplikacji (`src/**`, `app/**`, …)
3. Poproś agenta (skill brownfield): mapa Level 1–2
4. Włącz `npm run check:codemaps-sync` w CI tego repo (lub pre-commit)

---

## Dla agenta AI (Cursor)

Obowiązkowo przy feature / refaktorze / usuwaniu / bugfixie:

1. Przeczytaj aktualny `.codemaps/architecture.json` (lub slice)
2. Zaktualizuj mapę w **tym samym** change set co kod
3. Bug znaleziony → `health: critical` + sensowny `codeRef`
4. Bug naprawiony → `health: stable` (lub `warning` jeśli WIP)
5. Usunięty moduł → usuń węzeł + krawędzie **albo** `status: deprecated`
6. Nie przebudowuj całej mapy przy lokalnej zmianie

Pełny playbook: [`.cursor/skills/codemaps-architect/SKILL.md`](../.cursor/skills/codemaps-architect/SKILL.md)  
Kontrakt JSON: [`AGENTS.md`](../AGENTS.md)

---

## Guard techniczny (`check:codemaps-sync`)

Skrypt: [`scripts/check-codemaps-sync.mjs`](../scripts/check-codemaps-sync.mjs)

```bash
npm run check:codemaps-sync
```

**Zachowanie:**

- Czyta `.codemaps/config.json`
- Jeśli `syncGlobs` jest puste / brak → **exit 0** (skip) — tak jest w repo narzędzia CodeMaps
- Porównuje zmiany względem `BASE` (domyślnie `HEAD`, tryb staged jeśli `--staged`)
- Gdy pliki pasujące do `syncGlobs` zmieniły się, a **nie** zmienił się plik mapy → **exit 1** + komunikat

### Konfiguracja (mapowany projekt)

```json
{
  "projectRoot": ".",
  "diagramRelativePath": ".codemaps/architecture.json",
  "syncGlobs": ["src/**", "app/**", "lib/**"]
}
```

### Escape hatch

- Komentarz w PR: `codemaps: no arch change`
- Lokalnie / CI: `CODEMAPS_SYNC_ALLOW=1 npm run check:codemaps-sync` (wymusza OK)
- Flaga: `node scripts/check-codemaps-sync.mjs --allow`

### Przykład CI (GitHub Actions)

```yaml
- run: npm run check:codemaps-sync
  env:
    # opcjonalnie: porównaj do main
    CODEMAPS_SYNC_BASE: origin/main
```

---

## Drift vs sync guard

| Tool | Pytanie | Zapisuje mapę? |
|------|---------|----------------|
| `npm run check:codemaps-sync` | Czy przy zmianie kodu (`syncGlobs`) jest też diff mapy w PR? | Nie — tylko fail CI |
| `npm run check:codemaps-drift` | Czy pliki na dysku zgadzają się z `codeRef` na mapie? | **Nie** — tylko raport |

Drift (Faza 4 MVP):

```bash
npm run check:codemaps-drift
npm run check:codemaps-drift -- --json
```

- UI: **Drift** na toolbarze · API: `GET /api/diagram/drift`
- Patch mapy robi człowiek lub agent (**Flow E** → Flow C)
- Escape: `CODEMAPS_DRIFT_ALLOW=1` / `--allow`

---

## Czego NIE robi sam proces sync / drift

- Nie generuje kodu z kafelka → **Faza 3** (prompt + agent)
- Nie auto-merguje mapy ze skanera → świadomy patch
- Nie zastępuje testów, typów ani code review

Sync guard + drift report = **sygnały**. Aktualna mapa nadal wymaga dyscypliny DoD.
