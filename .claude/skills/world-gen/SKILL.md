---
name: world-gen
description: >-
  Generate a new Castle Mystery level from a short player prompt with a multi-agent pipeline, then
  validate it with the solver and the world-test semantic check. A coordinator runs PURE specialist
  subagents — story-teller (gated by its own private story-critic quality loop), game-architect,
  game-scout, game-itemiser, game-cron, game-conclusions —
  in parallel where independent; each returns data + an apply-prompt, and a single SYNTHESISER agent
  is the only writer of the level md (one return per call, writing every transition). The separate
  read-only world-fix skill (solver + world-test) is the DECIDER — it returns a prioritised fix TODO + a
  READY/NEEDS-WORK verdict; world-gen loops implementing world-fix's recommendations via the wave agents
  until READY (just as the story-critic gates the story-teller); human-in-the-loop until the user
  confirms. Pass --verbose (--debug / -v) for a full agentic trace — every agent call and return,
  world-fix's reasoning over the solver + world-test outputs, and the coordinator's delegations. Use when
  asked to generate/author a new level, "world-gen", or continue the generative level generator. WRITES
  only _gen.*.md candidate files under public/levels/ (via the synthesiser).
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
  **story-teller → story-critic**) but never a sibling. **world-fix** is a read-only sub-hub you spawn:
  it calls the solver + world-test and returns advice (a fix TODO + verdict) — it **never writes and never
  calls the wave agents**. You (coordinator) implement its recommendations via the wave agents +
  file-writer, looping until world-fix returns `READY`.

## Input

`/world-gen [prompt] [--verbose]` — if a prompt arg is given, use it; for development the hardcoded
fixture is the "Three Blind Mice" rhyme (the `getPlayerInput()` seam). **`--verbose`** (aliases
`--debug`, `-v`) turns on the full agentic trace — see [Verbose / debug mode](#verbose--debug-mode).
Default (no flag) prints only step headlines.

## Before you start

Read `references/authoring-contract.md` (the level format the synthesiser must produce) and
`references/agent-contracts.md` (each subagent's IO). Skim `public/levels/00_prologue.md`.

## Pipeline (coordinator = you, the main loop)

Narrate each step for observability (the call made + a short summary of the return). **When `--verbose`
is set, emit the full trace defined in [Verbose / debug mode](#verbose--debug-mode) for every step
below** — each call, each return, world-fix's reasoning, and each coordinator delegation.

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

## Validate & fix — the world-fix loop (the decider)

Validation + the decision of "is this level done?" live in a **separate skill, `world-fix`**
(`.claude/skills/world-fix/SKILL.md`). `world-fix` is **read-only**: it runs the **solver** and the
**world-test** (player) check on a level and returns a **prioritised TODO list** of fixes
(BLOCKER/MAJOR/MINOR, each tagged with the **owning area/agent**) plus a **verdict** `READY` |
`NEEDS-WORK`. It never edits anything. `world-gen` is the **implementer**: it loops against `world-fix`
exactly as the story-teller loops against the story-critic — **keep implementing the recommended changes
until `world-fix` returns `READY` (no must-fix items)**, capped by `maxIterations`.

The loop (you, the coordinator):

1. **Call `world-fix`** on the candidate (spawn it as a subagent — IN: `levelFile`; it runs solver +
   world-test itself). It returns `{ verdict, ready, items:[{severity, area, issue, fix, evidence}],
   solver, worldTest }`.
2. **If `READY`** (no BLOCKER/MAJOR items) → stop the loop; go to human-in-the-loop. Otherwise:
3. **Implement each BLOCKER, then each MAJOR** item: for each, call the **owning wave agent** named in
   the item's `area` (game-cron / game-scout / game-itemiser / game-architect / game-conclusions; or
   story-teller as a last resort) for a targeted **delta**, and write it to the **canonical**
   `_gen.<slug>.md` via the **file-writer** (one write per change, each live-testable). Address MINOR /
   POLISH items best-effort within the cap.
4. **Re-run `world-fix`** and repeat from (2). The loop self-corrects: if a change introduces a new
   problem, the next `world-fix` pass flags it. Stop when `world-fix` says `READY` or `maxIterations`
   (default 3) is hit (then surface the remaining list to the user).
5. **Ambiguity / can't-fix → ask the user.** If `world-fix`'s recommendation is genuinely ambiguous, or
   a must-fix item resists repair within the cap, **ask the user** via `AskUserQuestion`, then continue
   with their steer.

Key point: `world-fix` **decides and advises**; `world-gen` **implements** (via the wave agents) and
**writes** (via the file-writer). The same `world-fix` skill is usable standalone — a game architect runs
`/world-fix <level>` to get the tailored TODO list and implements it themselves.

## Human-in-the-loop (ends the run)

Present the playable level and invite the user to test it (`npm run dev-gen` → the `(GEN) …` tab).
On a **change request**, treat it as another `world-fix` pass with the user's ask folded in: implement
via the owning wave agent → **file-writer**, then re-run `world-fix` to confirm still `READY` (each
transition written, so the user re-tests live). **The run ends only when the user confirms they're
happy** ("it's ok").

## Verbose / debug mode

When `--verbose` (`--debug` / `-v`) is set, stream the **entire agentic trace** to the Claude console.
This is a developer aid — **completeness over brevity, and ZERO truncation.**

### The line format — uniform across EVERY agent (enforced)

Every agent (the `COORDINATOR`, every subagent — story-teller, story-critic, game-architect, game-scout,
game-itemiser, game-cron, game-conclusions — the `file-writer`, the `world-fix` decider, the
`world-test` oracle, and the `solver`) emits these exact lines, identified by its own name:

```
[<AGENT_NAME>|IN]   <the agent's full input, as JSON>
[<AGENT_NAME>|CALL] <name of the agent it is about to call>
[<AGENT_NAME>|OUT]  <the agent's full output, as JSON, emitted just before it returns>
```

- `[<AGENT>|IN]` — emitted **on entry**, echoing the complete input it received.
- `[<AGENT>|CALL] <callee>` — emitted **immediately before** it calls another agent; the value is the
  **callee's name** (the called agent then emits its own `|IN` … `|OUT`). One `|CALL` line per call.
- `[<AGENT>|OUT]` — emitted **just before returning**, with the complete output.
- Free-form reasoning uses the bare prefix: `[<AGENT>] <note>` (e.g. world-fix's think-aloud, or
  `[COORDINATOR] slug → _gen.x.md`). Use `[AGENT_NAME]` (uppercase the role) consistently.

### NO TRUNCATION (hard rule)

Every JSON in an `|IN` / `|OUT` line is printed **in full in the Claude console** — the whole object,
every field, complete free-text values. **Never** abbreviate: no `…`, no `(N chars)`, no "summary",
no "(omitted)". If the `story` prose or a `description` is long, print all of it. The point of verbose
mode is to see the real data.

### Enforcement — the CALLER echoes its callee's IN/OUT inline (so it is always visible)

A subagent runs in its own isolated context, so its self-emitted lines only reach the user **when it
returns** (buried in that call's result), and **not at all if it is interrupted**. So visibility cannot
depend on the subagent alone. The rule:

- **The calling agent (normally the COORDINATOR) prints the callee's `[<callee>|IN] {full input}`
  immediately *before* spawning it**, and the callee's `[<callee>|OUT] {full output}` immediately
  *after* it returns — **inline in the main console**, untruncated. This guarantees every agent's `|IN`
  is visible the moment it is called (even if the call is then interrupted) and its `|OUT` the moment it
  returns, in correct order, without the user expanding any tool result.
- **Every spawned subagent is ALSO instructed to build its own trace** — `[SELF|IN]`, a `[SELF|CALL]`
  per call, the **full nested trace** of its callees, and `[SELF|OUT]` — and **return it verbatim**.
  This is how *nested* calls become visible: the coordinator cannot print a grandchild's lines itself,
  so the parent returns them and the coordinator relays them inline. E.g. the story-teller returns the
  embedded `[story-critic|IN]`/`[story-critic|OUT]` of each round; **world-fix** returns the embedded
  `[solver|…]` and `[world-test|…]` lines of its analysis.
- Net effect: the coordinator drives a single, ordered, full trace in the main console — its own
  `|IN`/`|CALL`/`|OUT` for direct calls, plus the relayed nested traces — so **every agent adheres to
  the contract and the user sees them all while the skill runs**.

### Parallel groups

Mark a parallel wave with a free-form line, then the members' full traces (which may interleave):
`[COORDINATOR] ‖ IN PARALLEL — wave 2 {game-architect, game-scout, game-itemiser}`.

### world-fix's reasoning + the coordinator's fix loop (the think-aloud)

`world-fix` (read-only) emits its `|IN`/`|CALL`/`|OUT` plus `[world-fix] …` reasoning that turns the two
oracle results into the prioritised TODO; the **coordinator** then implements and re-runs it. Per loop:

```
[COORDINATOR|CALL] world-fix
[world-fix|IN] {"levelFile":"_gen.<slug>.md"}
[world-fix|CALL] solver            … then [solver|IN]/[solver|OUT] (full fitness JSON) …
[world-fix|CALL] world-test         … then [world-test|IN]/[world-test|OUT] (full findings JSON) …
[world-fix] diagnose: <signal> → area <agent>  because <reason>   (one line per finding)
[world-fix] verdict: NEEDS-WORK (B blockers, M major)  |  READY (no must-fix)
[world-fix|OUT] {"verdict":"…","ready":<bool>,"items":[{"severity","area","issue","fix","evidence"}],"solver":{…},"worldTest":{…}}
[COORDINATOR] received world-fix TODO — implement BLOCKER then MAJOR (READY → stop)
[COORDINATOR|CALL] game-cron       … the owning agent for an item, its |IN/|OUT (the delta) …
[COORDINATOR|CALL] file-writer     … write CANONICAL _gen.<slug>.md, file-writer |IN/|OUT …
[COORDINATOR] re-run world-fix … loop until READY or maxIterations
```

Keep the trace **truthful**: a skipped item, a fix re-routed to a different agent, a cap hit, or a
must-fix that resisted repair (→ AskUserQuestion) must appear. Verbose mode **never changes behaviour —
it only exposes it**.

## Caps (no runaway)

- story-teller's internal **story-critic** loop: **≤ 3** critic rounds before it returns its best draft.
- world-fix fix loop: world-gen implements world-fix's recommendations for **≤ `maxIterations`** (default 3) world-fix passes before it stops / asks the human (even if world-fix isn't yet `READY`).
- One candidate per run. The human-in-the-loop is user-gated, not automatic.

## Report

The story (brief), the candidate path, the latest `evaluate` fitness JSON + world-test summary, and a
one-line verdict.

## After meaningful changes — maintain the docs

Append a dated row to the **Iteration History** in `world-gen-generative-level-design.md` (what was
generated + fitness + what worked/didn't) and bump its Changelog. **If any agent call changed** (new/
removed agent, payload, parallel grouping, LIVE↔PLANNED), update `world-gen-agentic-hld.md` too.
