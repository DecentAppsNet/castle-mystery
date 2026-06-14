---
name: world-gen
description: >-
  Generate a new Castle Mystery level from a short player prompt with a multi-agent pipeline, then
  validate it with the solver and the play-game semantic check. A coordinator runs PURE specialist
  subagents — story-teller (gated by its own private story-critic quality loop), game-architect,
  game-scout, game-itemiser, game-cron, game-conclusions —
  in parallel where independent; each returns data + an apply-prompt, and a single SYNTHESISER agent
  is the only writer of the level md (one return per call, writing every transition). A
  validator-coordinator runs a capped dual-oracle (solver + play-game) accept-if-better loop and
  returns the accepted improvements for the coordinator to write via the synthesiser; human-in-the-loop
  until the user confirms. Pass --verbose (--debug / -v) for a full agentic trace — every agent call and
  return, the validator's reasoning over the solver + play-game outputs, and the coordinator's
  delegations. Use when asked to generate/author a new level, "world-gen", or continue the generative
  level generator. WRITES only _gen.*.md candidate files under public/levels/ (via the synthesiser).
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
below** — each call, each return, the validator's reasoning, and each coordinator delegation.

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

## Validate & improve — validator-coordinator (dual-oracle, accept-if-better)

Spawn the **validator-coordinator** (IN: level filename, `story`, current md, `maxIterations`,
optional `direction`). It runs a bounded **improvement loop** over **both oracles** and returns the
*accepted improvements* for you (the coordinator) to write — **it never writes the canonical md itself**
(DR-017). Each iteration (≤ `maxIterations`):

1. **Score both oracles.** `npm run evaluate --silent -- _gen.<slug>.md` (the **solver** — gates
   `charactersReachable` / `itemsReachable` / `noAnachronisms` + complexity) **and** the **play-game**
   subagent (the **semantic** oracle — structured per-character Identities inferability, per-conclusion
   difficulty, conflicts). Combine into one **combined fitness** (failing gates dominate; then a soft
   score: complexity in the target band + play-game difficulty balance + breadth + story coherence).
2. **Diagnose → route.** Map each failing gate / weak signal to the agent that owns that area and ask it
   for a **targeted delta** (a pure return). Routing:
   - `loaded:false` (line named) / *"missing conclusion answer phrases…"* → **game-conclusions** (cloze
     answer not a category member — usually a title/heading mix-up) or the named section's agent.
   - `unreachable.characterIds` → **game-cron** (co-presence) ± game-architect (adjacency) / game-scout
     (start room). `unreachable.itemIds` → **game-cron** (route a witness) ± game-itemiser (placement).
   - `noAnachronisms:false` / `anachronisms[]` → **game-cron** (fix itinerary timestamps — an absolute
     arrival back-planned over earlier speech).
   - play-game Identities `none` → **game-scout** (clue) ± game-cron (clue scene); `too-easy` →
     game-scout / game-conclusions / game-cron; `too-hard`/`unsolvable` → game-scout / game-cron;
     conflict → game-scout / game-conclusions. Complexity off-band → game-cron (± architect/itemiser).
3. **Test on a scratch candidate.** The **file-writer** applies the delta to `_gen.<slug>.try.md` (NOT
   the canonical file); re-run **both** oracles on it.
4. **Accept-if-better.** Keep the delta **only if** combined fitness strictly improves **and no gate
   regresses**; else discard and try a different fix/agent. Accepted deltas accumulate in a **ledger**
   and carry forward. Keep iterating — best-effort — to build the best story/layout/timeline/items.
5. **Return** `{ status, finalFitness, playGameFindings, improvements (ledger), recommendedApplyOrder,
   humanQuestion? }`. It sets `humanQuestion` (status `needs-human`) when it can't decide (conflicting
   objectives, a gate it can't move, ambiguous `direction`).

**Then you (coordinator) write it.** If `humanQuestion` is set — or the return is otherwise ambiguous on
how to proceed — **ask the user** via `AskUserQuestion` first (optionally re-invoking the validator with
the answer as `direction`). Otherwise apply each accepted improvement (in `recommendedApplyOrder`) to the
**canonical** `_gen.<slug>.md` via the **file-writer** (one call per improvement, each written so the
user can live-test). The validator proposes; you decide and write.

(Until a separate validator-coordinator agent is spawned, run this loop inline as the coordinator, capped
the same way — but all md writes, scratch and canonical, still go only through the file-writer.)

## Human-in-the-loop (ends the run)

Present the playable level and invite the user to test it (`npm run dev-gen` → the `(GEN) …` tab).
On a **change request**, hand it to the validator-coordinator as a `direction`; it runs the same
accept-if-better loop and returns improvements, which you write via the **file-writer** (each transition
written, so the user re-tests live). **The run ends only when the user confirms they're happy**
("it's ok").

## Verbose / debug mode

When `--verbose` (`--debug` / `-v`) is set, stream the **entire agentic trace** to the Claude console.
This is a developer aid — **completeness over brevity, and ZERO truncation.**

### The line format — uniform across EVERY agent (enforced)

Every agent (the `COORDINATOR`, every subagent — story-teller, story-critic, game-architect, game-scout,
game-itemiser, game-cron, game-conclusions — the `file-writer`, the `validator-coordinator`, the
`play-game` oracle, and the `solver`) emits these exact lines, identified by its own name:

```
[<AGENT_NAME>|IN]   <the agent's full input, as JSON>
[<AGENT_NAME>|CALL] <name of the agent it is about to call>
[<AGENT_NAME>|OUT]  <the agent's full output, as JSON, emitted just before it returns>
```

- `[<AGENT>|IN]` — emitted **on entry**, echoing the complete input it received.
- `[<AGENT>|CALL] <callee>` — emitted **immediately before** it calls another agent; the value is the
  **callee's name** (the called agent then emits its own `|IN` … `|OUT`). One `|CALL` line per call.
- `[<AGENT>|OUT]` — emitted **just before returning**, with the complete output.
- Free-form reasoning uses the bare prefix: `[<AGENT>] <note>` (e.g. the validator's think-aloud, or
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
  embedded `[story-critic|IN]`/`[story-critic|OUT]` of each round; the validator returns the embedded
  `[solver|…]`, `[play-game|…]`, `[game-cron|…]`, `[file-writer|…]` lines of every iteration.
- Net effect: the coordinator drives a single, ordered, full trace in the main console — its own
  `|IN`/`|CALL`/`|OUT` for direct calls, plus the relayed nested traces — so **every agent adheres to
  the contract and the user sees them all while the skill runs**.

### Parallel groups

Mark a parallel wave with a free-form line, then the members' full traces (which may interleave):
`[COORDINATOR] ‖ IN PARALLEL — wave 2 {game-architect, game-scout, game-itemiser}`.

### The validator-coordinator's reasoning (its think-aloud)

In addition to its `|IN`/`|CALL`/`|OUT` lines, the validator emits `[VALIDATOR] …` reasoning lines each
iteration so a developer sees *why* it decides what it returns:

```
[VALIDATOR] iteration N
[VALIDATOR] solver result: <full fitness JSON>
[VALIDATOR] play-game result: <full findings JSON>
[VALIDATOR] combined fitness = <value>  (failing gate dominates; else soft = band + difficulty balance + breadth + coherence)
[VALIDATOR] diagnose: <signal> → route <agent>  because <reason>
[VALIDATOR] plan: attack <X> first  because <a failing gate dominates | weakest soft signal>
[VALIDATOR|CALL] game-cron            … then the game-cron |IN/|OUT …
[VALIDATOR|CALL] file-writer          … writes scratch _gen.<slug>.try.md, file-writer |IN/|OUT …
[VALIDATOR] recheck combined fitness' = <value'>
[VALIDATOR] decision: ACCEPT (Δ +<x>, no gate regressed) → ledger += <delta>  |  REJECT (<why>) → discard, try <next>
[VALIDATOR|OUT] { status, finalFitness, playGameFindings, improvements:[…], recommendedApplyOrder:[…], humanQuestion }
```

Then the coordinator's delegation on that return:

```
[COORDINATOR] received validator return — decision: <apply improvements | AskUserQuestion "…">
[COORDINATOR|CALL] file-writer        … write CANONICAL improvement 1/<n>, file-writer |IN/|OUT …
```

Keep the trace **truthful**: a skipped call, a rejected delta, a cap hit, or a fix re-routed to a
different agent must appear in the trace. Verbose mode **never changes behaviour — it only exposes it**.

## Caps (no runaway)

- story-teller's internal **story-critic** loop: **≤ 3** critic rounds before it returns its best draft.
- Validator-coordinator improvement loop: **≤ `maxIterations`** (default 3) before it returns/asks the human.
- One candidate per run. The human-in-the-loop is user-gated, not automatic.

## Report

The story (brief), the candidate path, the latest `evaluate` fitness JSON + play-game summary, and a
one-line verdict.

## After meaningful changes — maintain the docs

Append a dated row to the **Iteration History** in `world-gen-generative-level-design.md` (what was
generated + fitness + what worked/didn't) and bump its Changelog. **If any agent call changed** (new/
removed agent, payload, parallel grouping, LIVE↔PLANNED), update `world-gen-agentic-hld.md` too.
