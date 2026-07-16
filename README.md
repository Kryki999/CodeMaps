# CodeMaps

Wizualne centrum dowodzenia architekturą aplikacji.

Tablica jak Excalidraw — z jedną różnicą: główny rysownik to **agent AI w Cursorze**.
Ty korygujesz ręcznie; mapa żyje w Git obok kodu jako Architecture as Code.

> **Szczerze:** CodeMaps pomaga przy większych systemach (Next.js + API + DB + płatności + CMS),
> gdy mapa jest aktualizowana **razem z kodem**. Traktowana jako ozdoba — gnije jak stara dokumentacja.

## Po co to jest

- Utrzymać w głowie (i na ekranie), **co z czym jest połączone**
- Szybko zobaczyć „pożar” (`health: critical`) zamiast szukać igły w stogu siana
- Dać agentowi AI **zorganizowany kontekst** (slice drzewa), zamiast całego repo
- Trzymać **żywą dokumentację struktury** w kafelkach — nie w osobnych, zapomnianych `.md`

Mapa jest źródłem prawdy o **strukturze i intencji**. Kod pozostaje źródłem prawdy o **implementacji**.

## Stan projektu (fazy)

| Faza | Status | Opis |
|------|--------|------|
| **1** | Gotowe | Canvas, drag, krawędzie, SSE hot-reload, puchnące kafelki (dwuklik) |
| **2** | Gotowe | C4 (`parentId`), breadcrumbs / drill-down, living docs, `status` + `health`, `.codemaps/`, skill agenta, API slice |
| **3** | Gotowe (MVP) | Diagram → kod: przycisk **Prompt dla agenta** + skill Flow D (`stackProfile`: next / react-native) |
| **4** | Gotowe (MVP) | Drift report kod ↔ mapa (CLI / API / UI) — **bez** auto-zapisu JSON |

Dzisiejszy „brownfield” (mapa z istniejącego kodu) robi **agent + skill** — to zapowiedź Fazy 4, nie automatyczny skaner.

## Poziomy C4 (1 / 2 / 3)

| Poziom | Co widać | Przykład |
|--------|----------|----------|
| **1** | Kontenery systemu (`parentId: null`) | Frontend, Backend, PostgreSQL, CMS |
| **2** | Moduły wewnątrz kontenera | Auth, Checkout, Dashboard |
| **3** | Kluczowe funkcje / typy | `handleLogin`, `createPayment` |

Nawigacja: dwuklik = edycja kafelka; **Wejdź do środka** = drill-down; breadcrumbs = powrót w górę.
Level 3 tylko dla hot pathów — mapowanie każdej funkcji zabija utrzymanie.

## Quick start

```bash
npm install
npm run dev
```

Otwórz przeglądarkę (domyślnie Next.js). Mapa ładuje się z:

- **Diagram:** [`.codemaps/architecture.json`](.codemaps/architecture.json)
- **Konfig:** [`.codemaps/config.json`](.codemaps/config.json) — `projectRoot` + `diagramRelativePath`
- **Env:** `CODEMAPS_PROJECT_ROOT` — absolutna ścieżka do zewnętrznego repo (np. Clubify)

W UI: przycisk **Projekt** zmienia `projectRoot` i **stackProfile** (po zapisie odśwież stronę).

## Poradnik użytkownika (człowiek)

CodeMaps to tablica w przeglądarce + agent w **Cursorze**. W apce nie ma czatu AI — Ty rysujesz/korygujesz mapę, agent edytuje JSON i kod na Twoje polecenie.

### 1. Pierwsze uruchomienie

1. `npm install` → `npm run dev`
2. Otwórz appkę w przeglądarce — zobaczysz demo mapę.
3. Kliknij **Projekt**:
   - `projectRoot` = `.` (to repo) albo ścieżka do innego projektu (np. Clubify)
   - `stackProfile` = `next` albo `react-native`
   - zapisz i odśwież stronę
4. Na mapowanym projekcie w `.codemaps/config.json` ustaw też `syncGlobs` (np. `["src/**", "app/**"]`), jeśli chcesz guard CI.

### 2. Tablica — podstawowe gesty

| Akcja | Efekt |
|--------|--------|
| Przeciągnij kafelek | Zmiana pozycji (zapis do JSON) |
| Połącz uchwyty (handles) | Nowa krawędź między węzłami |
| **Dwuklik** w kafelek | Expand — edycja nazwy, purpose, notatek tech, tech, deps, exports, codeRef, status, health |
| **Wejdź do środka** (gdy ma dzieci) | Drill-down na poziom niżej |
| **Breadcrumbs** (System > …) | Powrót wyżej |
| Esc w expanded | Anuluj edycję (nie wychodzi z poziomu) |
| Enter (w polu nazwy) | Zapisz edycję kafelka |

Kolor ramki = **lifecycle** (`planned` / `existing` / `deprecated`).  
Kropka na rogu = **health** (`stable` / `warning` / `critical`).

### 3. Toolbar

| Przycisk | Do czego |
|----------|----------|
| **Drift** | Raport: czy kod na dysku zgadza się z `codeRef` na mapie (nic nie zapisuje) |
| **Projekt** | `projectRoot`, ścieżka mapy, `stackProfile` |
| **Nowy** | Pusta mapa |
| **Wgraj** / **Pobierz** | Import / eksport JSON |
| Live / Offline | Czy SSE widzi zmiany pliku mapy |

### 4. Typowe scenariusze

**A) Mam już kod — chcę mapę (dowolne repo)**

1. Otwórz **to repo** w Cursorze (albo podaj absolutną ścieżkę w prompcie).
2. Skopiuj prompt z sekcji [**Prompt: włącz CodeMaps w projekcie**](#prompt-włącz-codemaps-w-projekcie) → wklej w czat agenta.
3. W appce CodeMaps: **Projekt** → wskaż folder projektu (**Wybierz…**) → Zapisz.
4. Kliknij **Drift** — popraw broken / brakujące `codeRef`.

**B) Nowy pomysł — najpierw mapa, potem kod**

1. Użyj wariantu *greenfield* z tej samej sekcji promptów (albo dorysuj ręcznie).
2. Dwuklik → **Prompt dla agenta** → wklej w Cursor (+ swoje wymagania).
3. Agent koduje i aktualizuje mapę w tym samym change set.

**C) Drobna zmiana w istniejącym module**

1. Wystarczy czat w Cursorze: *„W Checkout zrób X; zaktualizuj mapę jeśli trzeba”*.
2. Przycisk promptu z kafelka jest opcjonalny (gdy chcesz gęsty kontekst).
3. Kosmetyka bez zmiany architektury → `codemaps: no arch change`.

**D) Kontrola, czy mapa nie kłamie**

1. UI **Drift** albo `npm run check:codemaps-drift`
2. Na findings: popraw JSON sam / agentem (*Flow E*).
3. Przy PR: trzymaj się DoD z sekcji Synchronizacja (albo `docs/SYNC.md`).

### 5. Zasady, żeby mapa żyła

- Nie mapuj Level 3 wszystkiego — tylko krytyczne ścieżki.
- Feature „done” = kod **i** aktualna mapa (albo świadome `codemaps: no arch change`).
- Raz na jakiś czas: szybki przegląd Level 1 (kontenery + główne krawędzie).

### 6. Gdzie szukać dalej

| Chcesz… | Dokument |
|---------|----------|
| **Prompt startowy do dowolnego projektu** | [README — Prompt: włącz CodeMaps](#prompt-włącz-codemaps-w-projekcie) |
| Sync, CI, DoD dla leada | [`docs/SYNC.md`](docs/SYNC.md) |
| Format JSON / reguły agenta | [`AGENTS.md`](AGENTS.md) |
| Jak agent ma myśleć (flow A–E) | [`.cursor/skills/codemaps-architect/SKILL.md`](.cursor/skills/codemaps-architect/SKILL.md) |

## Prompt: włącz CodeMaps w projekcie

Skopiuj jeden z promptów poniżej do czatu Cursora w **mapowanym repo** (albo wskaż ścieżkę).  
Agent powinien znać skill `codemaps-architect` (Flow B / A). Aplikację CodeMaps uruchamiasz osobno (`npm run dev` w repo CodeMaps) i podpinasz `projectRoot` na ten folder.

### Brownfield — mam kod, zrób mapę (zalecane na start)

```text
Włącz CodeMaps w tym projekcie (brownfield / Flow B).

Kontekst narzędzia:
- CodeMaps to tablica architektury; źródło prawdy mapy = `.codemaps/architecture.json` w TYM repo.
- Nie rysuj Mermaid/PlantUML jako mapy — tylko JSON CodeMaps (version "1.1", flat nodes + parentId).
- Trzymaj się skillu codemaps-architect + kontraktu AGENTS.md (jeśli masz dostęp do repo CodeMaps / skilla).

Zrób po kolei:
1. Utwórz folder `.codemaps/` w rootcie tego projektu (jeśli brak).
2. Utwórz `.codemaps/config.json`:
   - "projectRoot": "."
   - "diagramRelativePath": ".codemaps/architecture.json"
   - "stackProfile": "next" LUB "react-native" (dopasuj do stacku)
   - "syncGlobs": sensowne globy appki (np. ["app/**", "src/**", "components/**", "lib/**"])
3. Przeskanuj repo lekko (manifesty, app/, features/, API, DB, zewnętrzne SDK) — nie mapuj każdego pliku.
4. Napisz `.codemaps/architecture.json`:
   - Level 1: kontenery / runtime / external (parentId: null)
   - Level 2: główne moduły, na których nam zależy
   - Level 3: TYLKO jeśli poproszę albo dla krytycznego hot-pathu
   - Istniejący kod: status "existing" + codeRef do realnej ścieżki
   - Planowane / stuby: status "planned", health "warning" gdy mock/scaffold
   - Na każdym sensownym kafelku (zwłaszcza L1–L2):
     - purpose = prostym językiem: po co to jest, za co odpowiada (zrozumiałe bez kodu)
     - description = notatki techniczne (mock vs real, ograniczenia, wskazówki)
   - tech, deps, exports gdzie mają sens
   - Krawędzie tylko realne zależności (http, data-flow, dependency, …)
5. Walidacja: unikalne kebab-case id, parentId/edges wskazują istniejące węzły, metadata.updatedAt = teraz.
6. Na koniec krótko podsumuj: co zmapowałeś, gdzie leży plik, jaki stackProfile, co jest planned/warning.

Potem człowiek w UI CodeMaps: Projekt → wybierz ten folder → Zapisz → Drift.
```

### Greenfield — najpierw mapa z koncepcji (mało / zero kodu)

```text
Narysuj architekturę CodeMaps z koncepcji (greenfield / Flow A).

- Zapisz `.codemaps/architecture.json` (+ config jak wyżej) w wskazanym / bieżącym projekcie.
- Tylko Level 1 na start (kontenery + realne krawędzie). Level 2 tylko jeśli poproszę.
- status: planned; purpose (prosty język) + krótkie description (tech) + tech.
- Bez Mermaid jako SSOT. Nie wymyślaj głębokiego drzewa Level 3.
- Po mapie: zaproponuj kolejny krok (drill-down jednego kontenera LUB scaffold z kafelka).
```

### Po starcie — typowe follow-upy (skróty)

```text
Sprawdź drift CodeMaps (Flow E) i popraw mapę według findings — bez pełnego remapowania.
```

```text
Wejdź w kafelek <id>, zrób <feature>; trzymaj zakres slice; zaktualizuj mapę w tym samym change set (albo napisz codemaps: no arch change).
```

```text
Dwuklik → Prompt dla agenta z kafelka już wkleiłem poniżej. Zaimplementuj według Flow D.
```

## Faza 3 — Diagram → kod

CodeMaps **nie generuje** kodu samo. Składa kontekst z mapy dla agenta w Cursorze.

1. Dwuklik w kafelek → **Prompt dla agenta** (kopiuje prompt ze slice + zależności + instrukcje stacku)
2. Wklej w czat Cursora; dopisz własne wymagania jeśli chcesz
3. Agent scaffolduje kod w `projectRoot` i aktualizuje `.codemaps/architecture.json`

Profil stacku (`.codemaps/config.json` → `stackProfile`):

- `next` — Next.js App Router (domyślnie)
- `react-native` — Expo / RN (bez `app/api` w mobile)

Możesz też **bez przycisku** poprosić agenta o dodanie kafelka i implementację — przycisk to akcelerator kontekstu, nie obowiązkowa bramka.

## Faza 4 — Drift (kod ↔ mapa)

Skaner porównuje pliki w `projectRoot` (Next lub Expo/RN wg `stackProfile`) z `codeRef` na mapie.

```bash
npm run check:codemaps-drift
npm run check:codemaps-drift -- --json
```

- UI: przycisk **Drift** na toolbarze
- API: `GET /api/diagram/drift`
- **Nie zapisuje** mapy — Ty lub agent (Flow E) patchujecie `.codemaps/architecture.json`
- Findings: `missing_on_map`, `broken_codeRef`, `missing_codeRef`

To inne niż `check:codemaps-sync` (guard: czy mapa weszła do PR przy zmianie kodu). Szczegóły: [`docs/SYNC.md`](docs/SYNC.md).

## Praca z agentem (Cursor)

W aplikacji **nie ma** wbudowanego czatu AI. Agent w Cursorze edytuje JSON.

| Plik | Rola |
|------|------|
| [`AGENTS.md`](AGENTS.md) | Kontrakt formatu (pola, walidacja) |
| [`.cursor/skills/codemaps-architect/SKILL.md`](.cursor/skills/codemaps-architect/SKILL.md) | Proces (flow A–E) + **First Contact** dla nowego agenta |
| [`.cursor/rules/diagram-editing.mdc`](.cursor/rules/diagram-editing.mdc) | Trigger przy pracy nad mapą |
| [`docs/SYNC.md`](docs/SYNC.md) | Jak utrzymać sync mapa ↔ kod |

Przykładowe prompty:

- **Onboarding dowolnego repo:** sekcja [Prompt: włącz CodeMaps w projekcie](#prompt-włącz-codemaps-w-projekcie)
- *„Zmapuj ten projekt do CodeMaps, Level 1–2, status existing + codeRef”* (krótka forma)
- *„Dodaj moduł Payments pod Backend i połącz z Stripe (external)”*
- *„Zmieniając checkout, zaktualizuj też `.codemaps/architecture.json`”*
- *Wklejony prompt z przycisku „Prompt dla agenta”* → Flow D (scaffold)

## Synchronizacja mapa ↔ kod (krytyczne)

Bez dyscypliny mapa kłamie. Minimalny kontrakt:

1. **Atomic commit / PR** — zmiana architektury = kod + `.codemaps/architecture.json`
2. **Definition of Done** — „feature gotowy” obejmuje update mapy (jak testy)
3. **Agent** — skill wymaga patcha JSON przy feature / bugfix (`health`)
4. **Audit** — raz na sprint 10–15 min przegląd Level 1
5. **Guard (opcjonalnie)** — `npm run check:codemaps-sync` w CI / pre-commit

Szczegóły dla leadów, agentów i CI: **[`docs/SYNC.md`](docs/SYNC.md)**.

```bash
# Ostrzeżenie, gdy zmienił się kod (syncGlobs), a nie mapa
npm run check:codemaps-sync
```

W [`.codemaps/config.json`](.codemaps/config.json) ustaw `syncGlobs` (np. `["src/**", "app/**"]`) w mapowanym projekcie.
Pusta tablica = check pomija (domyślnie w tym repo narzędzia).

## Stack

Next.js 16 · React 19 · React Flow · Zustand · Zod · Dagre · Chokidar (SSE)

## Roadmapa (skrót)

- **Faza 3–4 MVP:** prompt z kafelka + drift report (bez auto-merge mapy)
- **Później:** suggested patch JSON, głębszy reverse Level 3, health z CI

## Licencja / status

Projekt w aktywnym rozwoju (post Faza 2). API i schemat `1.1` mogą ewoluować przed 1.0 stabilnym.
