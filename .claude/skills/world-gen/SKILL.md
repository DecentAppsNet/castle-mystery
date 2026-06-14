---
name: world-gen
description: >-
  Generate a new Castle Mystery level from a short player prompt with a multi-agent pipeline, then
  validate it with the solver and the play-game semantic check. A coordinator runs PURE specialist
  subagents — story-teller (gated by its own private story-critic quality loop), game-architect,
  game-scout, game-itemiser, game-cron, game-conclusions —
  in parallel where independent; each returns data + an apply-prompt, and a single SYNTHESISER agent
  is the only writer of the level md (one return per call, writing every transition). A
  validator-coordinator runs the capped solver/play-game tweak loop, with human-in-the-loop until the
  user confirms. Use when asked to generate/author a new level, "world-gen", or continue the
  generative level generator. WRITES only _gen.*.md candidate files under public/levels/ (via the
  synthesiser).
---

# world-gen — generative level designer

Turn a short **player prompt** into a fully playable **narrative level** — a self-contained story
within a level's context boundary, like the authored examples under `public/levels/xx_level.md`. This
is the generator half of the generator/validator system designed in
**`docs/design/world-gen-generative-level-design.md`**; the agentic call graph is in
**`docs/design/world-gen-agentic-hld.md`**; the per-agent IO structures are in
**`references/agent-contracts.md`** (next to this file).

## Architecture invariants (follow exactly)

- **Subagents are pure.** Each takes only the input it needs (see agent-contracts.md) and returns a
  custom structure ending in a **`prompt`** field that tells the synthesiser how to apply it. **A
  subagent never writes a file.**
- **The synthesiser is the sole writer.** Only the synthesiser creates/updates
  `public/levels/_gen.<slug>.md`. You (coordinator) call it with **the current md + exactly one
  subagent's return + that subagent's identifier**; it applies that return and writes the file, then
  returns the updated md. Repeat per return. Writing every transition lets the user test live with
  `npm run dev-gen`.
- **Run independent subagents in parallel.** Subagents that need the *same* input (and not a prior
  modified md) are spawned concurrently; the synthesiser still applies their returns one at a time.
- **Hub-and-spoke, no lateral calls.** Subagents never call each other; everything routes through a
  coordinator. A subagent may spawn its *own* private child (vertical sub-delegation — e.g.
  **story-teller → story-critic**) but never a sibling. The validator-coordinator is a sub-hub you
  spawn; it may call the wave subagents + the synthesiser, and routes human questions back up to you.

## Input

`/world-gen [prompt]` — if a prompt arg is given, use it. For development, the hardcoded fixture is the
"Three Blind Mice" rhyme (the `getPlayerInput()` seam).

## Before you start

Read `references/authoring-contract.md` (the level format the synthesiser must produce) and
`references/agent-contracts.md` (each subagent's IO). Skim `public/levels/00_prologue.md`.

## Pipeline (coordinator = you, the main loop)

Narrate each step for observability (the call made + a short summary of the return).

**Wave 1 — story-teller** (solo). IN `playerPrompt` → OUT `story` (+ apply-prompt). **Internally the
story-teller runs its own private `story-critic` loop** (vertical sub-delegation): it drafts the story,
spawns the **story-critic** to score it (plot, flow, intrigue, historical/setting accuracy, characters,
denouement — book-publisher craft), applies the critic's `improvements`, and re-scores — returning only
a story the critic **`accept`s** (or its best draft after the critic-loop cap, flagged as short). The
critic is private — the coordinator never sees it. Then call the **synthesiser** (md=none,
id=`story-teller`) to create the file (General title/winSynopsis). The full `story` is **context** you
pass to later waves — it is not otherwise written to the md.

**Wave 2 — architect ∥ scout ∥ itemiser** (spawn all three in parallel; each IN = `story`).
- game-architect → rooms/map data; game-scout → characters + distinct real faces from
  `public/assets/faces/`; game-itemiser → items.
Then call the **synthesiser once per return**, in the order architect → scout → itemiser (so placement
resolves): each call = `current md + that return + its id`, and writes the file.

**Wave 3 — cron ∥ conclusions** (spawn both in parallel; each IN = `story` + the current md).
- game-cron → itinerary (its `coPresencePlan` must make it solve — **anchor on level-start
  co-presence**; relative `:` movements do not register solver co-presence). game-conclusions →
  `# Conclusions` (explicit `## Identities` + cloze; every cloze answer a category member — character/
  room/item **titles** or an author-defined category).
Then call the **synthesiser once per return** (cron → conclusions), writing each.

## Validate & tweak — validator-coordinator

Spawn the **validator-coordinator** (IN: level filename, `story`, `maxIterations`). It:
1. Runs `npm run evaluate --silent -- _gen.<slug>.md` (structural) and the play-game semantic check.
2. Acts on the output within `maxIterations`: for a fix, calls the relevant **wave subagent** for a
   targeted delta and routes it through the **synthesiser** (which writes). Reads:
   - `loaded:false` → format error (message names the line). *"missing conclusion answer phrases…"* →
     game-conclusions (a cloze answer not in any category — usually a title/heading mix-up).
   - `gates.ok:false` → solvability: `unreachable.*` → game-cron/scout (fix co-presence / placement).
   - play-game gaps / too-easy / conflicts → game-scout (clues) / game-conclusions / game-cron.
3. Surfaces a **`humanQuestion`** up to you when it needs user input; you ask via `AskUserQuestion` and
   pass the answer back down.
4. Returns status + fitness + play-game findings.

(Until the validator-coordinator is built, run steps 1–2 inline as the coordinator, capped the same
way — but file writes still go only through the synthesiser.)

## Human-in-the-loop (ends the run)

Present the playable level and invite the user to test it (`npm run dev-gen` → the `(GEN) …` tab).
On a **change request**, route it through the validator-coordinator / the relevant wave subagent →
synthesiser (each transition written, so the user re-tests live). **The run ends only when the user
confirms they're happy** ("it's ok").

## Caps (no runaway)

- story-teller's internal **story-critic** loop: **≤ 3** critic rounds before it returns its best draft.
- Validator-coordinator tweak loop: **≤ `maxIterations`** (default 3) before it returns/asks the human.
- One candidate per run. The human-in-the-loop is user-gated, not automatic.

## Report

The story (brief), the candidate path, the latest `evaluate` fitness JSON + play-game summary, and a
one-line verdict.

## After meaningful changes — maintain the docs

Append a dated row to the **Iteration History** in `world-gen-generative-level-design.md` (what was
generated + fitness + what worked/didn't) and bump its Changelog. **If any agent call changed** (new/
removed agent, payload, parallel grouping, LIVE↔PLANNED), update `world-gen-agentic-hld.md` too.
