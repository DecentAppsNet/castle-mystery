---
name: world-gen
description: >-
  Generate a new Castle Mystery level from a short player prompt using a multi-agent pipeline, then
  validate it with the solver. A coordinator runs specialist sub-agents — story-teller (infer a world
  + backstory), game-architect (rooms/map/exits), game-scout (characters + hidden identities),
  game-itemiser (items), game-cron (itinerary of movement + dialogue) — to emit a candidate level into
  public/levels/ as a flat _gen.*.md file, then scores it with `npm run evaluate`. Use when asked to
  generate/author a new level, "world-gen", or continue the generative level generator. WRITES only
  _gen.*.md candidate files under public/levels/.
---

# world-gen — generative level designer (Phase 1: one-shot pipeline)

Turn a short, high-level **player prompt** into a fully playable **narrative level** — a self-contained
story within a level's context boundary, like the authored examples under `public/levels/xx_level.md`.
This is the generator half of the generator/validator system designed in
**`docs/design/world-gen-generative-level-design.md`** (read it for the full architecture, fitness
model, and roadmap). The validator is the solver, consumed here via `npm run evaluate`.

**This skill writes only `_gen.*.md` candidate files under `public/levels/`.** It never edits existing
levels, `levels.md`, or app code. Generated candidates are not added to `levels.md`, so the app never
lists them in normal `npm run dev`. (Candidates are **flat** files — `_gen.<slug>.md`, not a
subdirectory — because the app's level loader only loads flat filenames directly under `/levels/`.)

Phase 1 goal: produce **one loadable, solver-passing candidate** end-to-end. No optimization loop yet
(that is Phase 3); no human steering yet (Phase 4). Keep it bounded — see Caps.

## Input

`/world-gen [prompt]`

- **For development the prompt is hardcoded** to the "Three Blind Mice" fixture below (this is the
  `getPlayerInput()` seam the design calls for — swap real input in later):

  ```
  Three blind mice, three blind mice,
  See how they run, see how they run,
  They all ran after the farmer's wife,
  Who cut off their tails with a carving knife,
  Did you ever see such a thing in your life,
  As three blind mice?
  ```

- If a prompt argument is given, use it instead.

## Before you start

Read **`.claude/skills/world-gen/references/authoring-contract.md`** — the exact level format the
agents must follow — and skim `public/levels/00_prologue.md` (the canonical minimal working level).
Every sub-agent you spawn must be given the authoring contract in its prompt.

## Pipeline (the coordinator = you, the main loop)

Run these stages in order, spawning each as a sub-agent (Agent tool). Each stage receives the
**current candidate** (the level Markdown so far) plus the story and the authoring contract, and
returns the **full updated candidate** (return the whole file, not a patch — simplest to assemble).
Stamp every stage's headline output back to the user so the run is observable (the prompt sent, and a
short summary of what came back).

1. **story-teller** — input: the player prompt. Output: a `story` (prose): the inferred world and
   backstory. *E.g. Three Blind Mice → a farmhouse on a working farm; a sharp-tempered farmer's wife;
   three near-blind mice; a missing wheel of cheese; a carving knife.* Define WHO the characters are
   (their hidden identities), WHERE (the rooms), and WHAT happened — enough for the builders to work
   from. Keep it to a tight few paragraphs.

2. **game-architect** — input: story + contract. Output: `# General`, `# Map`, `# Rooms` (rooms,
   rectangular map blocks, 3-row room grids, exits between adjacent rooms, the active character
   chosen). Lay out 3–5 rooms that fit the story.

3. **game-scout** — input: current candidate + story + contract. Output: adds `# Characters` (each
   with a description that is the *hidden-identity clue*), places them in room grids, and adds a
   `## Identities` conclusion (auto-generates the per-character name blanks). Pick the
   `activeCharacter` and ensure everyone can become connected to them.

4. **game-itemiser** — input: current candidate + story + contract. Output: adds `# Items` and places
   them in room grids (or characters' inventories). Phase 1: items are story-flavour; just ensure each
   placed item will be witnessed by a reachable character.

5. **game-cron** — input: current candidate + story + contract. Output: writes the `# Itinerary` — a
   timeline of movement and dialogue that **(a)** transitively connects every character to the active
   character via shared-room co-presence and **(b)** brings reachable characters into the rooms where
   items sit. This is the stage that makes the level *solve*. Add a cloze `## <what happened>`
   conclusion if the story has a clear "what happened".

## Assemble & validate

1. Write the final candidate to `public/levels/_gen.<slug>.md` (e.g. `_gen.three_blind_mice.md`) — a
   **flat** file, NOT a subdirectory (the app loads only flat filenames under `/levels/`).
2. Score it: `npm run evaluate --silent -- _gen.<slug>.md`.
3. Read the fitness JSON:
   - `loaded:false` → a **format error** (the message names the offending line). Fix via the relevant
     stage and re-validate. This is the loader acting as linter.
   - `gates.ok:false` → a **solvability error**. `unreachable.characterIds` / `unreachable.itemIds`
     name what's stranded. Send those back to **game-cron** (usually) to add co-presence / move items,
     and re-validate.
   - `gates.ok:true` → success. Report the fitness (counts + complexity) and the path.

## Manual verification (optional)

To eyeball a candidate in the real game UI, run **`npm run dev-gen`** (not plain `npm run dev`):
generated `_gen.*.md` levels appear as **`(GEN) …`** tabs in the level selector, read fresh on each
browser refresh. Normal `npm run dev` and production builds exclude them.

## Caps (no runaway)

- **Repair attempts: ≤ 3** total across load + gate failures. If still failing, stop and report the
  last fitness JSON + the remaining problem (a legitimate result that motivates Phase 2's dedicated
  gate/repair loop). Do not loop indefinitely.
- One candidate per run (no beam/optimization in Phase 1).

## Report

Show: the story (brief), the final candidate path, the `evaluate` fitness JSON, and a one-line verdict
(`✅ loadable & solver-passing` / `⚠️ loadable, N unreachable` / `❌ failed to load after repairs`).

## After a successful run — maintain the design doc

Per the maintenance convention, append a dated row to the **Iteration History** in
`docs/design/world-gen-generative-level-design.md` recording what was generated and its fitness
(what worked / what didn't), and bump its Changelog.

## Not in Phase 1 (see the design doc)

- The optimization loop (game-gen strategist, beam hill-climb, ledger) — **Phase 3**.
- Human-in-the-loop steering between rounds — **Phase 4**.
- The `/play-game` semantic gate and extra conclusion types (role/age/colour) — **Phase 2 / 5**.
