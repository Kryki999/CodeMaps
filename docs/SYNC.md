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
- [ ] Mapa odzwierciedla zmianę **albo** świadome `codemaps: no arch change`
- [ ] Przy zmianie kafelka: sensowny `purpose` (prosty język), `rationale` (dlaczego / intencja, gdy decyzja produktowa), `description` (tech) jeśli zachowanie/stan tech się zmienił
- [ ] W PR widać diff `.codemaps/` **albo** komentarz: `codemaps: no arch change`

**Kiedy mapa NIE jest wymagana:** poprawka copy/CSS, drobny bugfix w istniejącym pliku bez nowej odpowiedzialności, rename lokalny bez zmiany granic modułów.

**Kiedy uzupełniać `rationale`:** nowy ficzer / zmiana kierunku / świadomy trade-off omówiony z człowiekiem — zapisz w mapie, nie zostawiaj tylko w czacie. Brownfield bez źródeł „dlaczego” → nie zmyślaj.

**Kiedy warto odpalić Drift przed pracą:** nowy moduł, podmiana mock→API, większy refaktor granic — nie przy kosmetyce.

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

1. W Cursorze wklej prompt z [README — Prompt: włącz CodeMaps w projekcie](../README.md#prompt-włącz-codemaps-w-projekcie) (brownfield lub greenfield)
2. Ustaw w UI CodeMaps `projectRoot` na to repo (lub `CODEMAPS_PROJECT_ROOT`)
3. Upewnij się, że `syncGlobs` w `.codemaps/config.json` obejmuje ścieżki aplikacji
4. Odpal Drift; włącz opcjonalnie `npm run check:codemaps-sync` w CI / pre-commit

---

## Dla agenta AI (Cursor)

Obowiązkowo przy feature / refaktorze / usuwaniu / bugfixie:

1. Przeczytaj aktualny `.codemaps/architecture.json` (lub slice)
2. Przy **większym** tasku rozważ drift (`npm run check:codemaps-drift`) zanim napiszesz dużo kodu
3. Zaktualizuj mapę w **tym samym** change set co kod — **albo** napisz `codemaps: no arch change` przy kosmetyce
4. Bug znaleziony → `health: critical` + sensowny `codeRef`
5. Bug naprawiony → `health: stable` (lub `warning` jeśli WIP)
6. Usunięty moduł → usuń węzeł + krawędzie **albo** `status: deprecated`
7. Nie przebudowuj całej mapy przy lokalnej zmianie; nie reimplementuj sąsiadów z mapy
8. Aktualizuj `purpose` / `rationale` / `description` gdy zmienia się sens, intencja lub stan tech kafelka

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
