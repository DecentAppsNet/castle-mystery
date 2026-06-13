# ADR: Level Solver — Character Co-Presence Graph and Reachability

## Status

Accepted (Phase 1). Intentionally **unnumbered** to avoid colliding with in-progress numbered ADRs
on other branches; rename to a number when it lands on a shared trunk.

## Context

We want to mechanically check that a level is *playable to completion* — that the narrative gives
the player enough to infer the conclusion/identities. The player follows actors and can switch to
any actor who shares the current actor's room. The foundation for that analysis is a graph of the
cast, which later phases enrich (clue/item locations) and analyse (information flow / inference).

This ADR covers Phase 1: build the graph, render/serialize it, and answer one question — **is every
character reachable from the player's starting actor?**

## Decision

### 1. Nodes are characters; an edge is room co-presence

The graph's nodes are the level's characters. An undirected edge connects two characters who were
in the same room at the same time (a "scene" together). Undirected because, when two actors share a
room, the player can switch freely between them.

### 2. Edges are recomputed from co-presence, not reused from `CharacterEncounterEvent`s

`addCharacterEncounterEvents` (used for the timeline) deliberately reports only *new* encounters and
diffs out characters already co-present at the level's start. That makes it unsuitable as the sole
edge source — it would miss pairs who begin a scene together. The solver instead recomputes
co-presence directly using the same primitives (`findCharacterPose`, `findRoomAtPosition`).

A character's room only changes at `ROOM_ENTRY` events, so co-presence is constant between
consecutive room entries. We therefore sample co-presence at **the level start time plus every
`ROOM_ENTRY` timestamp across all characters**, which captures every room-occupancy configuration.
Each edge records its `(time, roomId)` co-presences — free edge weight and a seed for later
temporal/inference analysis.

### 3. The edge model is future-proofed for directed edges

Every edge carries a `directed` flag and `sourceId`/`targetId`. Phase 1 emits only undirected edges
(`directed:false`), stored once per unordered pair with `sourceId` < `targetId`. A later phase will
emit `directed:true` edges for actors who are hidden from others sharing their room (they can be
observed, but the player cannot switch into them from that room). Reachability already walks edges
according to the flag, so that change needs no rework here.

### 4. Placement: top-level `src/solver/`

The solver lives at `src/solver/` (sibling to `src/levelLoading/`, `src/game/`). It is an offline
analysis layer over the game domain: it depends on `@/game/*` types and helpers, and nothing in the
runtime game loop depends on it. This mirrors how `levelLoading/` was extracted from `game/`.

### 5. Outputs: always-on ASCII for humans, JSON for automation

`solveLevel()` always populates an `asciiArt` rendering (node legend + adjacency matrix +
reachability summary + `RESULT: PASS/FAIL`) so the graph is visible whether the solver is invoked
from the CLI or programmatically. `characterGraphToJsonObject()` produces the stable machine
contract that a future validator consumes. (We chose ASCII over Graphviz/DOT so the output is
self-contained in a terminal and a pre-commit hook, with no external renderer.)

### 6. First validation: reachability from the active character

The Phase 1 check is graph reachability from `level.activeCharacterId`. All characters are nodes
(including the victim); whether the player can *inhabit* a dead actor is a later refinement. If the
active character is absent from the graph, the result is reported as failed with a clear reason
rather than guessing.

### 6a. Second validation: item reachability through characters

Reaching every character is necessary but not sufficient — the player must also be able to *find*
the items. We add an item-reachability graph rendered below the character graph (same node-legend +
matrix + reachability + `RESULT` style), and `solveLevel()` returns a combined `ok`: the level
passes only when **both** every character and every placed item are reachable. The CLI exits
non-zero if either check fails.

- **Nodes are placed items.** An item is a node when it is actually placed in the level (in a room
  or held by a character), enumerated via `createItemsById(level.rooms, level.characters)`.
  `level.itemsById` is deliberately *not* used as the node source: it also carries
  imported-but-unplaced definitions (`items.md` is shared across levels), which would produce
  spurious "unreachable" nodes.
- **Witnesses come from co-presence, resolved through the real game runtime.** Items move during the
  timeline (characters take/drop/give them), so item→room is dynamic. Rather than re-derive item
  locations, the builder constructs a `GameState` and replays it with `rebuildDynamicStateForTime()`
  at each sample time (level start plus every `ROOM_ENTRY` and item-movement tick — the only times a
  character's or item's room can change). At each sample, every item records the characters sharing
  its room as "witnesses". This reuses the single source of truth for item movement instead of
  duplicating take/drop/give semantics.
- **An item is reachable iff a *reachable* character witnesses it.** There is no item-to-item
  propagation: the player reaches items only by following reachable characters. The witness matrix's
  columns are the characters in the same order as the character legend (so a column index lines up
  with the same `[i]` index above), and each column is marked reachable/unreachable so a failure is
  self-explanatory.

### 7. CLI runs via `vite-node`, seeded for determinism

`scripts/solve.ts` (`npm run solve`) reads levels from disk and reuses the transport-agnostic
`createLevelTextWithImportTexts` + the synchronous `loadLevelFromText`. It runs under `vite-node` so
`@/` aliases and the loader resolve exactly as in the app (plain Node resolves neither `@/` nor
`src`'s extensionless imports). It seeds the RNG with `0` before each level — matching the app's
local behaviour — so `randomSalt` (the only RNG consumer in loading) is reproducible. A level that
fails to load is reported and counted as a failure; the CLI exits non-zero if any level fails, so it
can back a pre-commit hook.

## Consequences

- The co-presence graph reflects generated movement, which depends on the RNG seed; the CLI fixes
  seed `0` for reproducibility. Document this if the deployed game ever uses a different seed.
- Reachability here is co-presence connectivity, not room/door connectivity — a deliberately
  narrow Phase 1 definition that will expand.

## Future phases (out of scope here)

Item *reachability* (can the player be co-present with each item) now ships alongside character
reachability; still ahead: tying items to the specific clues/conclusions they support ("where clues
are found" and "can the conclusion be proven from what the player can observe?"), directed edges for
hidden actors, wiring the CLI into an actual git pre-commit hook, and in-app visualization.
