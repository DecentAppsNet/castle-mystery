# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (port 3000).
- `npm run build` — `tsc` typecheck, Vite build, then copy `dist/.vite` into `public/` (needed so dev server can serve the manifest).
- `npm run lint` — ESLint over `.ts`/`.tsx`; warnings fail (`--max-warnings 0`).
- `npm run check:unused-exports` — `knip` for unused exports.
- `npm test` — Vitest single-run over `src/` (app code only).
- `npm run testscripts` — Vitest single-run over `scripts/` (the `cmgen` tooling has its own `tsconfig.json` and tests).
- `npm run test:watch` — Vitest watch mode.
- `npm run test:coverage` — V8 coverage. `**/*.tsx` and `**/interactions/**` are excluded in `vite.config.ts`.
- Run a single test file: `npx vitest run path/to/file.test.ts`. Filter by name: `npx vitest run -t "test name"`.
- `npm run cmgen` — content/image-generation CLI (`scripts/cmgen.ts`); see "Content & asset generation" below.
- `npm run solve` — level solver/validator CLI (`scripts/solve.ts`, via `vite-node`); see "Level solver" below. Exits non-zero if any level has unreachable characters, unreachable items, or fails to load.

The README's top half is a template placeholder — the real product is a murder-mystery puzzle game (see `public/levels/*.md`). The "What You Have Now" section of README describing an LLM home screen is stale; the actual `HomeScreen` is the game UI.

## Skills

- `/play-game [level]` — analysis-only Claude skill ([.claude/skills/play-game/SKILL.md](.claude/skills/play-game/SKILL.md)) that "plays" a level the way a player would and reports whether each character's **Identities** are inferable from witnessable clues (their description, conversations, object/item text, behaviour). Output is per-level and per-conclusion: each character mapped to its clue chain, with too-easy / too-hard / unsolvable-gap authoring feedback. Skips levels with no Identities conclusion; reads `public/levels/*` only and never edits them. Identities is the only conclusion analysed for now.

## Architecture

### Level files drive everything

A level is an authored Markdown file in `public/levels/` (e.g. `01_birth_of_constantine.md`). The Markdown is the source of truth for rooms, characters, items, an itinerary, and conclusions. Loading is orchestrated by [src/game/levelLoading/levelUtil.ts](src/game/levelLoading/levelUtil.ts):

1. `parseSections()` (from [src/common/markdownUtil.ts](src/common/markdownUtil.ts)) splits the file by `#` headings into sections: `general`, `map`, `rooms`, `characters`, `items`, `itinerary`, `conclusions`.
2. Section-specific loaders (`levelRoomLayoutLoader`, `levelRoomPopulationLoader`, `levelItineraryLoader`, `levelConclusionsLoader`) progressively populate a `Level`.
3. Errors are wrapped via `LoadLevelException` with the offending source line — preserve that context when refactoring loaders.

All loaders live under [src/levelLoading/](src/levelLoading/) (top-level — **not** under `src/game/`), with itinerary sub-loaders under `src/levelLoading/itineraryLoading/` and the level-set manifest in `manifestUtil.ts`.

The middle layer (`markdownUtil`) is a generic "Markdown-as-config" convention (heading sections + `* name=value` bulleted lines). New authored formats should use these helpers rather than inventing parsing.

### Runtime model: `Level` → `GameState`

`createGameState(level, imageSet)` in [src/game/gameUtil.ts](src/game/gameUtil.ts) turns the immutable `Level` into a mutable `GameState` ([src/game/types/GameState.ts](src/game/types/GameState.ts)). `GameState` is the single in-memory model — there is no Redux/store. The React tree reads it, the game loop mutates it, and `rebuildDynamicStateForTime()` re-derives world state for a given time by replaying the itinerary.

### Architecture decisions (read the relevant ADR in `docs/` before editing the area it covers)

- [ADR 001](docs/adr-001-itinerary-timestamp-resolution.md) — Itinerary timestamp resolution. Arrival activities (`Character @ Room`) at time `t` are **back-planned** so the character's pose at `t` is already correct — don't treat them as start times. Same-timestamp mutating activities resolve in a fixed deterministic order, not by searching for a "correct" ordering.
- [ADR 002](docs/adr-002-readonly-by-default.md) — Readonly by default. Prefer `readonly` and shared instances over defensive deep copies; copy only when mutation is required. For mutable arrays of immutable elements use `Readonly<T>[]`, not `readonly T[]` wrappers. Some fields (e.g. `Character.itinerary`, `itineraryIndex`) intentionally stay mutable because level loading assigns them post-construction.
- [ADR 003](docs/adr-003-waypoint-based-room-navigation.md) — Waypoint-based room navigation. Characters always rest on or travel between waypoints. Each room has its own inset exit waypoints per connected exit (no `waypoint` member on `RoomExit` itself); cross-room transitions are handled explicitly, not via a unified graph. `Waypoint.exitDirections` is precomputed by per-room flood fill keyed by adjacent room id; `adjacentExits` was removed.
- [ADR 004](docs/adr-004-file-order-relative-itinerary-timestamps.md) — `:` timestamps are file-order relative lower bounds: the activity begins only after the previously authored activity has completed. Distinct from absolute `H:MM:SS` timestamps. For `: Character @ Room`, generated movement starts after the prior activity rather than being back-planned.
- [ADR 005](docs/adr-005-runtime-image-assets.md) — Runtime image assets live on `GameState.imageSet` (`Map<string, ImageBitmap>`), not on `Character`. `Character` stores `faceImageUrl:string|null` (the cache key); `loadLevelFromText/Url()` does **not** load images; `createGameState(level, imageSet?)` stays synchronous (empty `ImageSet` when omitted). Image loading is orchestrated explicitly in app init (level → ImageSet → game state). Drawing code resolves images via `gameState.imageSet[character.faceImageUrl]` with a circle fallback. Only `ImageBitmap` is supported as the decoded type.
- [ADR 006](docs/adr-006-time-slider-itinerary-markers.md) — TimeSlider itinerary markers (Proposed). `TimeSlider` stays presentational and receives the active character's itinerary as a prop derived from `gameState.initialCharacters` (the immutable source), not from the mutable `gameState.characters`. The active character is plumbed React-ward via the same `LevelView` → `updateAndDraw()` callback pattern already used for `onMinutesChanged`. Marker derivation (room-entry ticks, clustered speech spans using `SPEECH_CLUSTER_GAP_MSECS`, encounter icons) belongs in a dedicated utility, not in JSX. `CharacterEncounterEvent` is a first-class itinerary event generated during itinerary postprocessing, not computed in the UI.
- [ADR 007](docs/adr-007-timeline-start-end-config.md) — Timeline start/end configuration. The `# general` section gains `startTime` (the preferred name; `time` remains a legacy alias) and an optional `endTime` that may wrap past midnight. Read alongside ADR 009 before touching general-section time parsing.
- [ADR 008](docs/adr-008-dialogue-overlap-authoring.md) — Dialogue overlap authoring. `says` (the non-overlapping audible default) and `interrupts` are distinct authoring verbs; a single character may never have two overlapping speech events, and level loading fails if generated speech would overlap.
- [ADR 009](docs/adr-009-general-time-fields-reinterpretation.md) — General time fields reinterpretation. `startTime`, `time`, and `endTime` are intended as separate author-facing concepts: authored earliest time, initial slider time, and authored latest time. Read this ADR before changing general-section time parsing or timeline derivation.
- [ADR 010](docs/adr-010-level-asset-filename-normalization.md) — Level asset filename normalization. Authored fields for HTTP-loaded assets (e.g. `background=filename.png`) carry **filenames, not URLs** — the field name selects the asset bucket. Complements CONTRIBUTING's network rule and `baseUrl()`.
- [ADR (Solver)](docs/adr-solver.md) — Level solver. Characters are nodes; an undirected edge means two characters shared a room at the same time (co-presence, recomputed by sampling — *not* reused from `CharacterEncounterEvent`s, which skip start-of-level co-presence). Edge model is future-proofed for directed (hidden-actor) edges. Validates **two** reachabilities from the active character: every character, and every placed item (an item is reachable when a reachable character is co-present with it on the timeline). Both must pass. Read before changing `src/solver/`.
- [ADR 010](docs/adr-010-level-asset-filename-normalization.md) — Level asset filename normalization. Level-authored HTTP-loaded asset fields (`background`, `faceImage`, …) are **filenames only** — never paths, URLs, query strings, or directory separators. Level loading validates this and **fails loud** (`LoadLevelException`) rather than silently cleaning up. The runtime URL is derived by concatenating the validated filename onto a **fixed bucket** implied by the field (`background=sky.png` → `/assets/backgrounds/sky.png`; `faceImage=queen.png` → `/assets/faces/queen.png`); that concatenated host-relative path is the canonical identity stored in `Level`/`GameState`/`Character` and used as the `imageSet` key. A field that can map to more than one allowed bucket is stored at load time as ordered `CandidateUrls` (`string[]`) and resolved later (first that loads) during runtime asset loading, so level loading stays headless. `baseUrl()` stays a fetch-time concern — stored paths are not pre-normalized.

### Screen / interaction split

`src/homeScreen/HomeScreen.tsx` is the only screen. UI surface is split into:
- `levelView/` — canvas rendering of rooms/characters (delegates to `src/game/drawing/*`).
- `timeSlider/` — scrub bar with itinerary markers (see ADR 006).
- `levelSelector/` — picks the active level from the `levels.md` manifest.
- `conclusionsView/` — cloze-style conclusion UI; `src/game/conclusions/` owns conclusion data + discovery.
- `discoveriesView/` — shows clues/discoveries the player has uncovered (`DiscoveriesView`, `DiscoveryItem`).
- `dialogs/` — home-screen modals (`ClaimConclusionDialog`, `WinLevelDialog`), built on `src/components/modalDialogs/`.
- `interactions/` — `initialization.ts` boots a level, `gameplay.ts` exposes update callbacks (`updateTime`, `updatePlayPause`, `updateConclusions`, …). The `interactions/` folder is coverage-excluded by design — keep logic worth testing in `src/game/*Util.ts` modules instead.

### Shared components & app shell

- [src/components/](src/components/) is the reusable, presentational UI kit (`.tsx` + CSS modules): `canvas/Canvas`, `modalDialogs/*`, `slider/Slider`, `selector/Selector`, `progressBar/ProgressBar`, `playPauseButton/*`, `topBar/TopBar`, `contentButton/*`, `waitingEllipsis/*`. Screens compose these — don't duplicate them.
- `decent-portal` is the one substantive runtime dependency. It supplies assertion helpers (`assert`, `assertNonNullable`, `botch`) used throughout `src/`, plus the app shell: `DecentBar` (rendered by `components/topBar/TopBar.tsx`) and app-metadata init (`initAppMetaData`, `getAppId`) wired up in `src/init/`. (The README's "WebLLM home screen" text is template boilerplate and does not reflect this app.)
- `src/developer/` holds dev-only configuration (`config.ts`, `devEnvUtil.ts`).

### Content & asset generation (`scripts/`)

`scripts/cmgen.ts` (run via `npm run cmgen`) is an authoring-time CLI that generates level content and sprite images from templates declared in `scripts/cmgen.md` (e.g. `item`, `character`, `character-split`). It has its own `scripts/tsconfig.json`, helpers under `scripts/helpers/`, template source images in `scripts/templateImages/`, and its own test suite (`npm run testscripts`). It is **not** part of the app bundle.

### Level solver (`src/solver/`)

An offline analysis layer over the game domain (see [ADR (Solver)](docs/adr-solver.md)). `solveLevel(level)` in [src/solver/solverUtil.ts](src/solver/solverUtil.ts) builds a character co-presence graph ([characterGraphUtil.ts](src/solver/characterGraphUtil.ts)) and evaluates reachability from the active character ([reachabilityUtil.ts](src/solver/reachabilityUtil.ts)), then builds an item-reachability graph ([itemGraphUtil.ts](src/solver/itemGraphUtil.ts) — replays the timeline via `createGameState` + `rebuildDynamicStateForTime` to find which characters are co-present with each placed item) and evaluates it ([itemReachabilityUtil.ts](src/solver/itemReachabilityUtil.ts)). It then derives a first level-complexity metric — the minimum character transfers from each character to each placed item ([transferCostUtil.ts](src/solver/transferCostUtil.ts) via `findTransferDistances`, rendered by [transferCostSerializeUtil.ts](src/solver/transferCostSerializeUtil.ts)) — and builds a `RoomLayerView` ([roomLayerUtil.ts](src/solver/roomLayerUtil.ts)) that re-bins the same co-presence per room (recording the first-interaction time) and renders each room as an isometric 3D box laid out in a grid matching the level map, with `HH:MM` cells ([roomLayerSerializeUtil.ts](src/solver/roomLayerSerializeUtil.ts)) — a diagnostic visualization that does **not** affect `ok`. The verdict-bearing graphs + complexity table render to `analysisAscii` (always shown); the wide cube renders to `roomLayerAscii` (the CLI writes it to a temp file when wider than the terminal). The per-room timeline replay is shared between the item graph and the cube via [roomOccupancyUtil.ts](src/solver/roomOccupancyUtil.ts). All three render to an always-on ASCII view + JSON ([graphSerializeUtil.ts](src/solver/graphSerializeUtil.ts), [itemGraphSerializeUtil.ts](src/solver/itemGraphSerializeUtil.ts), [roomLayerSerializeUtil.ts](src/solver/roomLayerSerializeUtil.ts)); `SolveResult.ok` is true only when both reachability checks pass. It depends on `@/game/*` only (nothing depends back on it). The `scripts/solve.ts` CLI (`npm run solve`, via `vite-node`) adds disk I/O: it reads levels from `public/levels/`, merges imports with `createLevelTextWithImportTexts`, then calls `loadLevelFromText` + `solveLevel`.

### Exits and doors

Room exits carry status (`open` / `closed` / `locked`) and are first-class to both rendering and gameplay:
- [src/game/exitUtil.ts](src/game/exitUtil.ts) holds exit state queries; [src/game/exitImageUtil.ts](src/game/exitImageUtil.ts) names built-in door sprites that are seeded into the `ImageSet` automatically (see [src/game/imageSetUtil.ts](src/game/imageSetUtil.ts) — every level loads `BUILT_IN_EXIT_IMAGE_URLS` whether the level author references them or not).
- [src/game/drawing/exitDrawUtil.ts](src/game/drawing/exitDrawUtil.ts) renders doors; [src/game/drawing/popoverDrawUtil.ts](src/game/drawing/popoverDrawUtil.ts) renders the hover tooltips that explain door state.
- Exit state affects **audibility**: speech that happens behind a closed door isn't audible in the adjacent room; an open door lets it through. Authored door modifiers in the rooms section (`* exits=Foyer|lockable closed`) flow into this behaviour at runtime.

### Project-specific code rules (from CONTRIBUTING.md)

These are enforced in review — follow them in new code:

- **ID normalization** ([src/game/idUtil.ts](src/game/idUtil.ts)): any variable whose name contains `Id` must hold a normalized ID or `null`. Raw authored text goes in `...Text`/`...Name`/`...Ref` until `normalizeId()`/`normalizeOptionalId()` is called. Do not re-normalize a value already read from a `...Id` variable; use `assertNormalizedId()` if a debug guard is wanted. Note the single-character exception: 1-char IDs preserve case (map tiles like `c` vs `C`).
- **Function order**: callee above caller within a file; refactor cycles out; private (unexported) functions get a leading `_`. Only export what's used externally.
- **Regex**: every regex lives inside a function whose name fully describes what it matches (e.g. `findWhiteSpaceEnclosedNumber`, not `findNumber`). Shared helpers go in [src/common/regExUtil.ts](src/common/regExUtil.ts); feature-specific composition should be non-regex code that calls those helpers. All regex functions need unit tests.
- **Network**: all `fetch()` URLs must be passed through `baseUrl()` from [src/common/urlUtil.ts](src/common/urlUtil.ts), on or near the same line as the `fetch` call. No fetches outside the host domain. No alternative network APIs. Do not edit `urlUtil.ts` without explicit instruction (per the comment at top of the file).
- **CSS units**: `vh` is the default unit, even for widths (preserves aspect on a non-scrolling app). Use `rem` only for sentence/paragraph-length text. Avoid `px` and `!important`.

### Tests

- Unit tests: `<moduleFolder>/__tests__/<moduleName>.test.ts`. Top-level `describe('module name')`, nested `describe('functionName()')`.
- Integration tests: `src/<feature>/integration-tests/<feature>.test.ts` (e.g. [src/game/integration-tests/](src/game/integration-tests/)). Group with `describe('<feature> integration')`.
- **No filesystem, shell, subprocess, or network access in tests** — including via tooling. Import fixture content as text instead of reading files at runtime. Mock the boundary if the code under test would otherwise do real I/O.
- Use `setSeed()` from [src/common/randUtil.ts](src/common/randUtil.ts) for any test that depends on RNG (the app calls `setSeed(0)` automatically when served locally — see [src/init/init.ts](src/init/init.ts)).
- Prefer real code paths; mock only non-deterministic / side-effecting boundaries.
- Improve coverage with contract-based tests, not branch-shaped tests. For files that legitimately shouldn't be covered (mostly `.tsx` and pure-drawing modules), use a top-of-file `/* v8 ignore file -- @preserve */` with a short reason, or the project-level exclude when it's a broad category.

### Path alias

`@/` resolves to `src/` (configured in both `tsconfig.json` and `vite.config.ts`). Prefer `@/...` imports over deep relative paths.

### Persistence

[src/persistence/pathStore.ts](src/persistence/pathStore.ts) is a vendored IndexedDB key/value store with import/export and a versioned upgrade hook (`_upgradeRecord`). It's intentionally not a dependency — edit it in place. Bump `APP_DATA_VERSION` and add an upgrade handler when changing the shape of stored data.
