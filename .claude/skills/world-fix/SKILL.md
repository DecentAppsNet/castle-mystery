---
name: world-fix
description: >-
  Analyse one Castle Mystery level and return a prioritised TODO synopsis of fixes/improvements to make
  it solvable and free of playability issues. It is the read-only DECIDER: it runs the solver
  (`npm run evaluate`) and the world-test (player) check, then reports — it NEVER edits the level. Run it
  standalone as a game architect to get a tailored list of things to fix/consider (a level file
  argument is MANDATORY), or let `world-gen` use it as the gate it loops against while building a level
  (analogous to how the story-critic gates the story-teller). Use when asked to "world-fix", validate /
  check / triage a level, or get a fix list. ANALYSIS ONLY — writes nothing.
---

# world-fix — the level validator / decider

Given **one level**, decide whether it is **solvable and playable**, and if not, return a **prioritised
TODO list** of concrete, implementable fixes and improvements. This is the validator half of the
generator/validator system (see `docs/design/world-gen-generative-level-design.md`), extracted so it can
be used **independently** of generation.

**This skill is READ-ONLY. It never edits the level or any file.** It runs two oracles and reports:
- the **solver** (`npm run evaluate` / `npm run solve`) — structural: does it load, is every character
  reachable, every item reachable, no timeline anachronisms, and how deep is it.
- the **world-test** (player) skill — semantic: can a player actually *deduce* each identity and each
  conclusion from witnessable clues, or is something too-easy / too-hard / unsolvable / contradictory.

It turns those into **implementable actions** tagged with the area that owns them, so the reader (a human
architect, or `world-gen`) knows exactly what to change.

## Input

`/world-fix <levelFile>` — the level filename under `public/levels/` (e.g. `_gen.inception.md`,
`01_birth_of_constantine.md`). **The argument is MANDATORY when run manually** — with no file, stop and
say so (`world-fix needs a level file, e.g. /world-fix _gen.inception.md`). Do not default to "all
levels". Optional `--verbose` (`--debug` / `-v`) streams the full agentic trace (see *Verbose* below).

## Method

1. **Locate** the level under `public/levels/` (read it; read its imports if any). If it doesn't exist,
   say so and stop.
2. **Solver oracle.** Run `npm run evaluate --silent -- <file>` (use `npm run solve -- <file>` when you
   need the per-item/per-room detail). Read the fitness JSON:
   - `loaded:false` → a **format/load blocker** (the message names the offending line, e.g. *"missing
     required map section"*, *"missing conclusion answer phrases…"*, *"unknown character/item/room"*,
     *"unsupported itinerary activity"*).
   - `gates.charactersReachable:false` / `unreachable.characterIds` — stranded characters.
   - `gates.itemsReachable:false` / `unreachable.itemIds` — items no reachable character witnesses.
   - `gates.noAnachronisms:false` / `anachronisms[]` — a character scheduled in two places at once.
   - `counts` vs the authored level — e.g. **fewer placed items than defined** (an item dropped out of
     play, like a totem dropped at an off-room coordinate). `complexity.maxCost/meanCost` — depth.
3. **Player oracle.** Run the **world-test** analysis on the same file (spawn it as a subagent in verbose
   mode, or apply its method): per-character Identities inferability (`direct`/`combined`/`none`),
   per-conclusion difficulty (`too-easy`/`just-right`/`too-hard`/`unsolvable`), conflicts/ambiguities,
   and **whether the `# Conclusions` section even exists / its clozes are solvable**.
4. **Synthesise the TODO list.** Each item: **severity** · **area (owning agent)** · **issue** ·
   **recommended fix** · **evidence**. Order by severity:
   - **BLOCKER** — won't load or won't solve (`loaded:false`, unreachable char/item, anachronism).
   - **MAJOR (playability)** — an identity with **no** witnessable clue, a missing/contradictory
     conclusion, an item dropped out of play, a sprite collision.
   - **MINOR / POLISH** — too-easy (redundant tells) / too-hard, complexity out of band, thin scenes.
5. **Decide.** Emit a **verdict**: `READY` when the level **loads, solves (all gates ok), and has no
   BLOCKER or MAJOR issue** (solvable + no playability gaps); otherwise `NEEDS-WORK`. MINOR/POLISH items
   are advisory — they appear in the list but do **not** by themselves withhold `READY`.

## Routing — which area owns each fix

| Signal | Area (owning agent) | Recommended fix |
|---|---|---|
| `loaded:false` line / *"missing conclusion answer phrases"* | **game-conclusions** (or the named section) | fix the named line / make every cloze answer a category member (titles) |
| unreachable character | **game-cron** (± game-architect adjacency, game-scout start room) | bring the stranded character into a shared scene with the connected group |
| unreachable item / fewer placed items than defined | **game-cron** (± game-itemiser) | route a reachable character to witness it / fix where it is placed or dropped |
| anachronism | **game-cron** | fix the itinerary timestamps (an absolute arrival back-planned over earlier speech) |
| identity inferable = `none` | **game-scout** (± game-cron) | add a witnessable tell (description / a spoken line / a carried item) |
| conclusion missing or unsolvable | **game-conclusions** | author the `# Conclusions` cloze(s); ensure each blank is witnessable |
| too-easy / conflict | **game-scout** / **game-conclusions** | move a tell to items-only; add distractors; disambiguate |
| too-hard / unsolvable cloze | **game-scout** / **game-cron** | add a supporting clue or a clue-revealing scene |
| complexity below/above band | **game-cron** (± architect / itemiser) | deepen / shorten the transfer chains |
| thin/incoherent story (pervasive) | **story-teller** | re-deepen the story thread (expensive; last resort) |

## Output

A scannable synopsis, then (for programmatic callers like `world-gen`) the same as JSON.

```
world-fix — <levelFile> — VERDICT: READY | NEEDS-WORK   (B blockers · M major · m minor)
[BLOCKER] <area> — <issue>  → <fix>   (evidence: <quote/number>)
[MAJOR]   <area> — <issue>  → <fix>   (evidence: …)
[MINOR]   <area> — <issue>  → <fix>   (evidence: …)
solver: gates {charactersReachable, itemsReachable, noAnachronisms} · counts · meanCost
world-test: identities <x>/<n> (<direct/combined/none breakdown>) · conclusions <…>

todo (JSON): {"levelFile":"…","verdict":"READY|NEEDS-WORK","ready":<bool>,
  "items":[{"severity":"blocker|major|minor","area":"game-cron|game-scout|…","issue":"…","fix":"…","evidence":"…"}],
  "solver":{…fitness…}, "worldTest":{…findings…}}
```

`READY` with an empty `items` (or only advisory MINOR) means: solvable, no playability issues — done.

## How `world-gen` uses this (the gate it loops against)

`world-gen` calls `world-fix` on its candidate, **implements** each `BLOCKER`/`MAJOR` item by delegating
to the owning wave agent (game-cron / game-scout / …) and writing via the file-writer, then **re-runs
`world-fix`** — looping until `world-fix` returns `READY` (no must-fix items) or the cap is hit. `world-fix`
is the **decider** (it never implements); `world-gen` is the implementer. This mirrors the
story-teller↔story-critic gate. A standalone architect instead reads the TODO list and implements the
fixes themselves.

## Caps & invariants

- **Read-only**: never edit the level, `levels.md`, or app code. The only side-effects are running the
  read-only `npm run evaluate` / `npm run solve` and the read-only world-test analysis.
- One level per run. When invoked by `world-gen`, the **caller** owns the iteration cap, not this skill.

## Verbose / debug mode

When `--verbose` (`--debug` / `-v`) is set, follow the **same trace contract as world-gen** (see
`.claude/skills/world-gen/SKILL.md` *Verbose / debug mode*): emit `[world-fix|IN]` (the input), a
`[world-fix|CALL] <callee>` before each oracle call with the callee's full `[solver|IN]/[OUT]` and
`[world-test|IN]/[OUT]` (full JSON, **no truncation**), the `[world-fix]` reasoning that turns the two
oracle results into the prioritised TODO, and `[world-fix|OUT]` with the full todo JSON. The caller
(world-gen) echoes `[world-fix|IN]` before calling and relays this trace.
