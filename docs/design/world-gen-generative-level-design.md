# Design: Multi-Agent Generative Level Generator (`world-gen`)

## Status

**Living document.** Started 2026-06-14 on the `world-gen` branch. Design accepted;
implementation not started (Phase 0 pending). This document is maintained continuously —
see [How to use & maintain](#0-how-to-use--maintain-this-document).

## 0. How to use & maintain this document

This is the single source of truth for the generative level generator's design *and* its
evolution. It has three kinds of content:

- **The design** (sections 1–12): what we are building and how. Keep this describing the
  *current* design — edit in place as the design changes.
- **The [Decision Log](#13-decision-log)** (section 13): dated, ADR-style records of each
  significant choice (and the alternatives rejected). Append; don't rewrite history.
- **The [Iteration History](#14-iteration-history-what-worked--what-didnt)** (section 14):
  dated, empirical learnings from running the system — what produced good levels, what
  failed, which caps/weights we tuned and why.

Two of the sections are deliberately written to be **portable** — section 2 (the pattern)
and section 9 (steering/observability/capping) describe a reusable approach to
*generator/validator AI content generation* that should transfer to other projects (other
games, other generated artifacts) by swapping section 3's project bindings. Keep the
portable parts free of repo-specific detail.

> **When you touch this system, update this file in the same change.** A decision made and
> not recorded here is a decision we will re-litigate later.

---

## 1. Vision

A Claude skill takes a short, high-level **player prompt** describing a level and produces
a fully playable **narrative level** for this game — a self-contained story told within a
single level's context boundary, like the authored examples under
`public/levels/xx_level.md`. A level comprises rooms, characters with hidden identities,
items, a timeline of movement and dialogue, and conclusions for the player to infer. The
system then **iteratively improves it** under human steering until it hits the player's
desired complexity / playability / solvability.

The narrative need not be a murder mystery (the game's overall framing): a level tells
*whatever* bounded story the player prompt implies — see the Three Blind Mice fixture
below.

For all development work, the player prompt is hardcoded to a fixture (see below), with a
single seam (`getPlayerInput()`) to swap in real player input later.

**Development fixture — "Three Blind Mice":**

```
Three blind mice, three blind mice,
See how they run, see how they run,
They all ran after the farmer's wife,
Who cut off their tails with a carving knife,
Did you ever see such a thing in your life,
As three blind mice?
```

The system should infer a world from this (a farm; a farmer's wife; three mice; a carving
knife), write a backstory, and build a level around it.

---

## 2. The portable pattern (reusable)

> This section is intentionally project-agnostic. It is the reusable core: a recipe for
> **AI-generated content steered by a generator/validator loop**. Section 3 binds it to
> this repo.

**Generate → evaluate → accept/reject, around a single artifact, judged by two oracles,
steered by a human, capped at every level.**

1. **One evolving artifact as the single source of truth.** The thing being generated is
   kept in its *native, runnable form* (here: a level Markdown file), not a bespoke
   intermediate representation. Specialist agents patch it. This means the *real*
   validators run on the *real* artifact, and the artifact's own loader/parser doubles as
   a syntax linter (a malformed patch fails to load, which is itself a repair signal).

2. **Two complementary oracles.** Quality is judged by:
   - a **structural oracle** — deterministic, mechanical, cheap; answers *is it valid /
     reachable / how complex* with booleans and integers; and
   - a **semantic oracle** — model-judgment, expensive; answers *is it good / inferable /
     well-pitched for a human*.

   Neither alone is sufficient: content can be structurally valid but semantically dull,
   or semantically promising but structurally broken. The optimizer trades them off.

3. **LLM-guided local search.** A *strategist* proposes small mutations aimed at an
   objective, a *builder* realizes each mutation via specialist agents, the oracles score
   the results, and the strategist accepts improvements / rejects regressions — a
   hill-climb (optionally a beam, later simulated annealing or a genetic pool). A
   persistent **ledger** records every mutation and its score delta, giving the optimizer
   memory ("what helped before") and giving humans an audit trail.

4. **Human-gated, capped rounds.** The human sets the *objective* for each round (a
   direction, not a fixed scalar), approves between rounds, and every loop is bounded
   (beam width, iteration cap, repair cap, plateau-stop, optional token budget) so there
   is no runaway spend.

5. **Total observability.** Every prompt sent, every oracle output, and every
   accept/reject rationale is logged and surfaced. The strategist's reasoning is a
   first-class, schema-forced field, not hidden.

To port this pattern: keep 1–5; replace the artifact, the two oracles, and the specialist
roster (section 3).

---

## 3. Project bindings (this repo)

| Pattern role | This repo |
|---|---|
| The artifact | A level `.md` file (the format the game already authors in `public/levels/`). |
| Structural oracle | The **solver** — `solveLevel()` ([src/solver/solverUtil.ts](../../src/solver/solverUtil.ts)); see [adr-solver.md](../adr-solver.md). |
| Semantic oracle | The **`/world-test` skill** ([.claude/skills/world-test/SKILL.md](../../.claude/skills/world-test/SKILL.md)). |
| Artifact loader / linter | `loadLevelFromText()` and the loaders under [src/levelLoading/](../../src/levelLoading/) — throw `LoadLevelException` with the offending source line. |

Both oracles already consume a level file, so the candidate is a *real* level — the
validators are the game's actual validators, not proxies.

### Why these two oracles are the right split

- The **solver** is the *structural* oracle (deterministic): can the player physically
  reach every clue by following and switching between co-present characters, and how many
  switches deep is each clue (complexity)? See adr-solver §6, §6a, §6b.
- **`/world-test`** is the *semantic* oracle (model judgment): *given* a clue is reachable,
  could a disciplined player actually *infer* the answer from witnessable evidence, and is
  it pitched right (too easy / too hard / unsolvable gap)?

A clue can pass one and fail the other (reachable but uninferable; inferable in principle
but unreachable). Both gates are required.

---

## 4. Current capabilities vs gaps

The two merged tools already provide most of what the loop needs. The solver in
particular already exposes machine-readable booleans and integer complexity — the
anticipated "tweak the solver to return booleans/ints via flags" is largely **already
done**.

**Already in place:**

- `solveLevel()` returns `SolveResult` ([src/solver/types/SolveResult.ts](../../src/solver/types/SolveResult.ts))
  with the verdict booleans we need directly:
  - `ok` (combined verdict), `reachability.ok` (all characters reachable),
    `itemReachability.ok` (all items witnessed by a reachable character);
  - the *why*: `reachability.unreachableIds[]`
    ([src/solver/types/ReachabilityResult.ts](../../src/solver/types/ReachabilityResult.ts))
    and `itemReachability.unreachableItemIds[]`
    ([src/solver/types/ItemReachabilityResult.ts](../../src/solver/types/ItemReachabilityResult.ts)).
- Integer complexity already exists in `transferCostTable`
  ([src/solver/types/TransferCostTable.ts](../../src/solver/types/TransferCostTable.ts)):
  per `(character → item)` the `cost` (fewest time-respecting character-switches) and the
  switch chain. This *is* the "chain switches to reach a clue" metric.
- `scripts/solve.ts` already accepts **filenames as args** and supports `--json` /
  `--out=<file>`, exits 0/1. No input path is hardcoded.
- The **Identities** puzzle is nearly free to author: an empty `## Identities` subsection
  auto-generates one blank per *interactive* character
  ([src/levelLoading/levelConclusionsLoader.ts](../../src/levelLoading/levelConclusionsLoader.ts)),
  and characters default to `isTitleKnown=false` (hidden). game-scout mainly needs to make
  characters interactive (description / face image / room placement) and drop an empty
  `## Identities`.

**Gaps to build (small adapters, not core surgery):**

1. ✅ **Complexity aggregates** — `max / mean / histogram` of `cost` across reachable pairs,
   computed in [`src/solver/fitnessUtil.ts`](../../src/solver/fitnessUtil.ts)
   (`_computeComplexityMetrics`). No solver-core change. *(Done 2026-06-14, Phase 0.)*
2. ✅ **A candidate entry point** — [`scripts/evaluateLevel.ts`](../../scripts/evaluateLevel.ts)
   (`npm run evaluate -- <file>`) loads a level, runs the solver, and emits the **fitness
   JSON** (gates + complexity aggregates + unreachable lists) via `buildLevelFitness()`.
   Candidates are flat `public/levels/_gen.<slug>.md` files (so they round-trip through the app's
   filename-based loader, and their `imports=characters.md|items.md` resolve relative to
   `public/levels/`). *(Done 2026-06-14, Phase 0; flat-file scheme per DR-009.)*
3. ⬜ **The semantic oracle as a structured signal.** Wrap `/world-test`'s analysis in a
   sub-agent that returns per-character `{ inferable, difficulty, gapNote }` rather than
   prose. *(Pending — Phase 2.)*

**Fitness JSON contract** (one entry per scored level, emitted by `evaluateLevel`):
`{ loaded:true, levelName, gates:{ charactersReachable, itemsReachable, noAnachronisms, ok },
counts:{ characters, items }, unreachable:{ characterIds[], itemIds[] }, anachronisms:[…],
complexity:{ totalPairCount, reachablePairCount, unreachablePairCount, maxCost, meanCost,
costHistogram } }` — or `{ loaded:false, levelName, error }` when the level fails to load (the G1
gate). See [`src/solver/types/LevelFitness.ts`](../../src/solver/types/LevelFitness.ts).

---

## 5. Shared state (what flows between agents)

| Artifact | Owner / writer | Role |
|---|---|---|
| `story.md` | story-teller | Prose backstory inferred from the player prompt. Conditions every downstream agent. Stable within a generation; revised only on request. |
| `level.md` (candidate) | the specialists patch it | **The single source of truth.** A real level file. |
| `evaluation.json` | evaluateLevel + world-test | Latest fitness vector for a candidate. |
| `ledger.jsonl` | game-gen | Append-only memory: per iteration, the directive (prompt) → diff → metric deltas → accept/reject + reason. Doubles as the observability log. |

Run artifacts live under a per-run directory (proposed: `generated/runs/<id>/`), with the
candidate(s) as flat `public/levels/_gen.*.md` files so imports resolve and they load in the app
(DR-009).

---

## 6. Agent topology

```
                         ┌─────────────┐
   player prompt ──────► │  /world-gen │  skill, main loop (outer)
   (Three Blind Mice)    │ outer loop  │◄──── human steering (AskUserQuestion)
                         └──────┬──────┘
                                │ one capped round at a time
                                ▼
                       ┌──────────────────┐
                       │   game-gen       │  strategist / optimizer
                       │ propose→eval→    │  reads ledger + metrics,
                       │ accept (capped)  │  emits a rationale
                       └───┬──────────┬───┘
              directives   │          ▲  scored candidates
                           ▼          │
                     ┌───────────┐    │
                     │coordinator│    │  builder: realizes ONE mutation
                     └─────┬─────┘    │
        ┌────────┬────────┬──────┬────────┬──────────┬──────────────────┐
        ▼        ▼        ▼      ▼        ▼          ▼                  ▼
   story-teller architect scout itemiser game-cron game-conclusions    specialist generators
     (story)   (rooms+   (chars)(items) (itinerary  (# Conclusions:     each patches level.md,
                exits)                    /movement)  Identities+cloze)  returns a diff + rationale
                                  │
                                  ▼
                        ┌──────────────────────┐
        candidate ────► │ VALIDATORS (oracles)  │
        level.md        │ • solver  (structural)│ booleans + transfer-cost ints
                        │ • world-test (semantic)│ per-char inferable + difficulty
                        └──────────┬───────────┘
                                   ▼  fitness vector + gates → back to game-gen
```

Two distinct controllers — keep them separate:

- **coordinator = builder.** Stateless w.r.t. optimization; given a directive, it invokes
  the right specialist(s) to *realize* one change.
- **game-gen = strategist.** Decides *what to try next*, reads metrics + ledger,
  accepts/rejects, and decides when to consult the human. It *calls* the coordinator.

| Agent | Input | Output / patches | Oracle? |
|---|---|---|---|
| story-teller | player prompt | `story.md` (runs a private **story-critic** loop until accepted) | — |
| ⮡ story-critic | story (from story-teller) | accept/revise + scores + reasons + improvements — story-teller's **private** child, capped | quality (story) |
| game-architect | story | `# Map`, `# Rooms` (grid, exits/doors, start rooms) | — |
| game-scout | story | `# Characters` (each `* title=` is the hidden identity; `* description=` is the clue; `* faceImage=` a distinct real file from `public/assets/faces/`) + placement in room grids | — |
| game-itemiser | story, rooms | `# Items` + placement in room grids | — |
| game-cron | story, rooms, chars, items | `# Itinerary` (movement / speech / encounters) | — |
| game-conclusions | story, level | `# Conclusions`: explicit `## Identities` + cloze conclusions + author-defined answer categories (every cloze answer a category member; character/room/item blanks use the **title**) | — |
| clue-author *(Phase 5)* | story, a conclusion type | one story-consistent clue extending **game-conclusions** (itinerary / item / description) | — |
| **solver** (validator) | candidate | gates + complexity ints | structural |
| **world-test** (validator) | candidate | per-char inferable + difficulty + gaps | semantic |
| **synthesiser** (file-writer) | current md + one subagent return + id + target file | the **sole writer** of any md — applies that return per its `prompt`, writes the file | — |
| **world-fix** (decider — its own skill) | a level file | runs solver + world-test; returns a **prioritised fix TODO** (`items:[{severity, area, issue, fix, evidence}]`) + verdict `READY`/`NEEDS-WORK`. **Read-only — never writes, never calls wave agents.** world-gen loops implementing its must-fix items until `READY` (DR-019); usable standalone | structural + semantic |

Authoring-format reference for the specialists (the contract they are fed) is distilled in
[Appendix A](#appendix-a-level-authoring-contract-summary). The concrete **agentic call graph** (who
calls whom, payloads, LIVE vs PLANNED) is maintained as a sibling HLD —
[world-gen-agentic-hld.md](world-gen-agentic-hld.md) — kept current as inter/intra-agent calls change.

**Revised generation/synthesis architecture (DR-012/013/014):** the generators are now **pure**
subagents (minimal custom inputs; each returns data + an apply-`prompt`); a single **synthesiser** is
the *only* writer of the level md (one return per call, writing every transition so a run is testable
live via `npm run dev-gen`); truly-independent subagents run in **parallel** (wave 2 =
architect/scout/itemiser on the `story`; wave 3 = cron/conclusions on the `story` + current md); and a
**validator-coordinator** sub-hub runs the capped dual-oracle improvement loop (**refined by DR-017**:
accept-if-better on solver + world-test, returning accepted improvements for the coordinator to write via
the file-writer; human-in-the-loop termination). Per-agent IO:
[`agent-contracts.md`](../../.claude/skills/world-gen/references/agent-contracts.md).

---

## 7. Fitness model

**Hard gates** (binary — failure rejects the candidate, or triggers a bounded repair):

| Gate | Source |
|---|---|
| G1 `loads` — parses + every cloze answer is in a conclusion category (`validateUnlockPhrases`), no `LoadLevelException` | loader |
| G2 `reachability.ok` — all characters reachable | solver |
| G3 `itemReachability.ok` — all items witnessed by a reachable character | solver |
| G3b `noAnachronisms` — no character scheduled into two overlapping same-channel activities (e.g. an absolute arrival back-planned over an earlier one) | solver |
| G4 `identitiesInferable` — no `⚠️ none` gaps *(configurable)* | world-test |

**Soft score** (continuous, normalized 0–1, weighted — the thing we hill-climb):

| Signal | Derived from | Steered toward |
|---|---|---|
| Clue-chain **depth/complexity** | `transferCostTable` mean/max `cost` | a *target band* (deep enough to be interesting, not unsolvable) |
| **Difficulty balance** | world-test ratio of just-right vs too-easy vs too-hard | mostly just-right; zero gaps |
| **Breadth** | #rooms / #chars / #items / #conclusions | human target |
| **Exploration spread** | co-presence graph + room-layer occupancy | interactions distributed; doors used |
| **Story quality** | the **story-critic** (story-teller's internal gate: plot / flow / intrigue / accuracy / denouement) | a publisher-grade story up front; stays on-theme |

The objective is **not fixed** — the human sets a *direction/target* each round ("make
identities harder", "add a room", "deepen the cook's clue chain"), which reconfigures the
weights/targets. Each round therefore has a concrete `f(candidate)` the optimizer
maximizes *subject to the gates*.

**Acceptance rule (DR-017).** The validator-coordinator scores a candidate with **both** oracles into one
**combined fitness** and keeps a change only if it is **strictly better**: candidate B beats A iff B
**fixes ≥1 failing gate without breaking another**, or — gates equal — B's **soft score is strictly
higher**. Each proposed delta is materialized on a **scratch** candidate and re-scored by both oracles
*before* it is kept; rejected deltas are discarded. So no change reaches the canonical md unless both
oracles agree it helped (or at least did not regress a gate).

---

## 8. Optimization loop (one round)

Realized as a **gate-until-READY loop** (DR-019): the read-only **`world-fix`** decider scores the
candidate (solver + world-test) and returns a prioritised fix TODO + a `READY`/`NEEDS-WORK` verdict; the
**coordinator** implements each must-fix via the owning wave agent, writes the canonical md via the
**file-writer**, and re-runs `world-fix` — repeating until `READY` (or the cap). world-fix decides;
world-gen implements; the file-writer is the sole writer; the human gate is the coordinator's. The loop
self-corrects (a regression is flagged on the next world-fix pass), so it needs no separate
accept-if-better/scratch step. The earlier generic hill-climb framing (below) is the conceptual ancestor:

```
input: best level L0, objective f (from human), iteration cap N, beam width B
repeat up to N times:
  1. game-gen proposes B mutation directives aimed at f,
     informed by the ledger (what helped before) + latest metrics
       e.g. "item 'carving knife' has cost 0 from active char → too shallow;
             move its witness two switches deeper"
  2. coordinator → specialists realize each directive → B patched candidates  (PARALLEL)
  3. evaluate each: loader gate → solver (cheap, deterministic) →
     world-test (model judge; survivors only / every few iters) → f + gates
  4. drop gate failures (or 1 bounded auto-repair using unreachableIds);
     among survivors pick argmax f
       if improved → accept (L0 ← best), append to ledger with deltas
       else        → record rejection, switch mutation class (anneal)
  5. stop early if target met, or no improvement for P iters, or budget hit
return best candidate + metric trajectory + ledger + human-readable diff & rationale
```

This is generator/validator with memory. It upgrades cleanly to simulated annealing
(accept some early regressions) or a genetic/beam pool — but hill-climb-with-beam is the
right start.

---

## 9. Human-in-the-loop, observability, capping

> Portable: this section, like section 2, is meant to transfer to other generator projects.

- **Rounds, not a runaway.** The human gates *between* rounds via `AskUserQuestion` ("more
  rooms? more characters? deeper clue chains? harder identities? add a *favourite-colour*
  conclusion?"). Their answer becomes the next round's objective. Total spend = rounds ×
  (B × N) evaluations, every round human-approved.
- **Hard caps everywhere** (see the [Caps registry](#10-caps--parameters-registry)).
- **Full transparency.** Every directive (the prompt), every solver JSON (booleans +
  costs), every world-test report, the f-score, the delta, and the accept/reject reason are
  written to `ledger.jsonl` and shown as a per-round digest. The strategist's "cognitive
  process" is a **schema-forced rationale field** on every decision, surfaced verbatim. In
  the Workflow substrate, `/workflows` additionally shows the live agent tree.
- **Verbose mode (`--verbose` / `--debug`) — DR-018.** A developer flag on `/world-gen` that streams the
  **whole agentic trace** to the user: every **agent → agent call** with its input, every **return** with
  its value (paired and indented by call depth; parallel waves marked), the **validator-coordinator's
  per-iteration reasoning** over the solver + world-test outputs (diagnosis → routing → the delta →
  scratch re-check → the accept/reject decision and *why*), and the **coordinator's delegation** of each
  accepted improvement to the file-writer (and any `AskUserQuestion`). Off by default (headlines only);
  it exposes behaviour without changing it. Trace format in the skill's *Verbose / debug mode* section.

---

## 10. Caps & parameters registry

All tunable bounds in one place, so capping is explicit and auditable. **Values below are
initial proposals, not yet validated** — record changes in the Iteration History with the
reason.

| Cap | Symbol | Initial | Purpose |
|---|---|---|---|
| Beam width | B | 3 | candidate mutations evaluated per iteration |
| Iteration cap / round | N | 5 | max accept/reject iterations before returning to human |
| Repair cap | R | 2 | bounded auto-repair attempts on a gate failure |
| Plateau stop | P | 2 | stop a round after P iterations with no improvement |
| story-critic loop | — | ≤ 3 | story-teller's private critic rounds before it returns its best draft |
| world-test cadence | — | survivors-only, ≤ every 2 iters | controls cost of the expensive semantic oracle |
| Rounds / session | — | human-gated (no fixed cap) | the human approves each round |
| Token budget | — | optional (`budget.total`) | hard ceiling when a token target is set |

---

## 11. Implementation substrate — **hybrid** (accepted)

The chosen substrate is **hybrid** (DR-004). The deciding constraint: **Workflow scripts
are sandboxed — no filesystem or shell** — so the deterministic solver CLI cannot run
*inside* a Workflow script.

- **Outer loop = the `/world-gen` skill in the main conversation.** Owns human rounds
  (`AskUserQuestion`), the digest, the caps, and runs the **solver via Bash**
  (deterministic, cheap, kept out of LLM hands).
- **Inner beam = an optional Workflow per round** for the parallel fan-out (B specialist
  mutations + world-test evals via `parallel()` / `pipeline()`, `schema`-forced structured
  returns, `budget` caps, live `/workflows` view). The skill then scores returned
  candidates with the solver and consults the human.
- **Specialists & world-test = agent calls** with the authoring contract + current level,
  schema-forced to return a diff + rationale. The world-test validator reuses the merged
  `SKILL.md` instructions.

No new infrastructure — the two tools + Agent/Workflow/Bash primitives + the small
adapters in section 4.

---

## 12. Phased build plan

All on the `world-gen` branch. Each phase is independently demoable.

| Phase | Delivers | Demo |
|---|---|---|
| **0 — Contracts & scoring** | `scripts/evaluateLevel.ts` → fitness JSON; complexity aggregates; the authoring-contract doc fed to agents; JSON schemas; flat `_gen.*.md` candidates under `public/levels/` | `evaluateLevel` scores an existing level |
| **1 — One-shot pipeline** | `/world-gen` (input hardcoded to Three Blind Mice) → story-teller → architect → scout → itemiser → cron → emit candidate | a loadable, solver-passing level; no optimization |
| **2 — Gates + auto-repair** | loader/solver as hard gates with ≤R repair from `unreachableIds`; world-test as Identities gate feeding gaps back | candidate that passes *both* oracles |
| **3 — Optimization loop** | game-gen strategist + beam hill-climb + ledger + plateau-stop | level measurably improves over N iters on a fixed objective |
| **4 — Human steering** | per-round `AskUserQuestion` → objective; full digest | you direct "harder identities / +1 room" and watch metrics move |
| **5 — Multi-conclusion clues** | clue-author agents for role/age/colour; world-test extended; new fitness dimensions | richer levels with several conclusion types |

**Phase 0 status (2026-06-14):** the structural-oracle scoring spine is **done** —
`LevelFitness` type, `buildLevelFitness()` + complexity aggregates (6 unit tests),
`scripts/evaluateLevel.ts` (`npm run evaluate`), and the flat `public/levels/_gen.*.md` candidate scheme.
Verified end-to-end on `01_birth_of_constantine.md` (18 chars, 8 items, all reachable;
`maxCost 2`, `meanCost 0.88`). Remaining Phase 0: distil the authoring contract (Appendix A)
into the form fed to agents, and define the inter-agent JSON schemas — both deferred to
Phase 1, where the agents that use them are built.

**Phase 1 status (2026-06-14):** the one-shot pipeline is **done and validated**. Built the
`/world-gen` skill (`.claude/skills/world-gen/SKILL.md`) and the authoring contract fed to agents
(`.claude/skills/world-gen/references/authoring-contract.md`). A real run (story-teller agent →
combined builder agent) generated `public/levels/_gen/three_blind_mice.md` — a 4-room, 6-character,
4-item Three Blind Mice level that **loads and passes the solver** (`gates.ok:true`, nothing
unreachable). Inter-agent contracts are described informally in the skill; formal JSON schemas stay
deferred until the Phase 3 optimization loop needs them. Two learnings fed back into the authoring
contract — see Iteration History.

---

## 13. Decision Log

ADR-style records of significant choices. Append new entries; mark superseded ones rather
than deleting.

### DR-001 — Build on a combined `world-gen` branch via merge (preserve commit identity)
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** The two tools live on separate feature branches (`timeline-debugger`,
  `player-debugger`) awaiting merge to `main`. We need both available now, on a branch
  that won't conflict when those branches later merge to `main` while `world-gen` is in
  active development.
- **Decision:** Create `world-gen` from `timeline-debugger`'s tip and `git merge --no-ff
  player-debugger`. Both branches had already merged the current `origin/main` (`9ace389`)
  into themselves (their merge-base), so the merge was clean. Merging *preserves commit
  SHAs*, so the feature commits remain shared ancestors; a later `git merge origin/main`
  will recognize them and re-apply nothing. The same merge approach was then reused to
  bring in `death-to-the-orient`'s documentation cleanup (SHAs preserved; only `CLAUDE.md`
  conflicted, resolved in favour of `world-gen`'s newer version).
- **Consequences / caveat:** This holds **only if the PRs land on `main` preserving SHAs**
  (a merge commit or fast-forward). If they are **squash-merged or rebase-merged**, `main`
  gets new SHAs with identical content; `world-gen` then carries duplicate history and may
  conflict in regions it has since edited. Mitigation: ask the maintainer to merge those
  two PRs as merge commits (not squash/rebase); if squashed, recover later by rebasing
  *only* `world-gen`'s own dev commits onto the new `main` and dropping the redundant
  feature commits.
- **Alternatives rejected:** cherry-pick / rebase the branches together (creates new SHAs
  → guaranteed future conflict when the originals merge).

### DR-002 — Dual-oracle generator/validator architecture
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Need an automatic measure of level quality to drive iteration.
- **Decision:** Use two oracles — the solver as a deterministic *structural* oracle, and
  `/world-test` as a model-judgment *semantic* oracle — and require both. The optimizer
  trades them off.
- **Consequences:** Quality is measured along orthogonal axes (reachable & complex vs
  inferable & well-pitched). Cost asymmetry: the structural oracle is cheap and run every
  candidate; the semantic oracle is expensive and rate-limited (caps registry).
- **Alternatives rejected:** a single LLM "is this a good level?" judge (no structural
  guarantee, non-reproducible); a single solver score (can't judge human inferability).

### DR-003 — The level `.md` is the single source of truth; the loader is the linter
- **Date:** 2026-06-14 · **Status:** Accepted
- **Decision:** Specialists patch a real level file rather than a bespoke IR. The game's
  own `loadLevelFromText()` validates syntax; a malformed patch throws `LoadLevelException`
  with the offending line, which becomes a repair signal.
- **Consequences:** The real validators run on the real artifact; no IR↔level translation
  layer to keep in sync. Risk: free-form Markdown editing can break format — mitigated by
  feeding agents the authoring contract (Appendix A) and using the loader as a gate.
- **Alternatives rejected:** a structured intermediate representation compiled to a level
  (adds a translation layer and a second source of truth).

### DR-004 — Hybrid orchestration substrate
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Workflow scripts are sandboxed (no fs/shell), but the solver is a
  deterministic CLI and human-in-the-loop steering is central.
- **Decision:** Outer loop + human rounds + deterministic solver scoring live in the
  `/world-gen` skill (main loop, via Bash); the optional inner parallel beam runs as a
  Workflow per round.
- **Consequences:** Determinism where it matters (solver scoring, caps, human gating);
  parallelism + structured output + live `/workflows` view where it helps (the beam).
- **Alternatives rejected:** *pure Workflow* (can't run the solver CLI; awkward mid-run
  human steering); *pure skill* (loses deterministic capping + easy parallel fan-out).

### DR-005 — Separate `coordinator` (builder) from `game-gen` (strategist)
- **Date:** 2026-06-14 · **Status:** Accepted
- **Decision:** The coordinator only *realizes* a mutation via specialists; the game-gen
  strategist owns search strategy, the ledger, accept/reject, and human consultation.
- **Consequences:** Search policy is testable/tunable in one place; builders stay simple
  and stateless.

### DR-006 — Reuse the solver's existing structured outputs; add only adapters
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Expected to need solver flags for booleans/ints; found `SolveResult` already
  exposes them and `solve.ts` already emits JSON.
- **Decision:** Don't modify the solver core. Add (a) complexity aggregates in an adapter
  and (b) a candidate-path `evaluateLevel` entry point emitting one fitness JSON.
- **Consequences:** Keeps the solver (and adr-solver) stable; the generator depends on a
  thin, well-defined contract.
- **Status update (2026-06-14):** Qualified by **DR-016** — when a *validation correctness* gap was
  found (a tour's final room unsampled; absolute-timestamp anachronisms undetected), the solver core
  *was* extended. The "adapter-only" stance holds for *derived metrics*, not for missing verdicts.

### DR-007 — Phased delivery with a hardcoded fixture
- **Date:** 2026-06-14 · **Status:** Accepted
- **Decision:** Deliver in phases 0–5 (section 12); hardcode the "Three Blind Mice" player
  prompt in Phase 1 behind a `getPlayerInput()` seam.
- **Consequences:** Each phase is demoable; real player input is a later, isolated change.

### DR-008 — `LevelFitness` is the structural-oracle JSON contract
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** The generator needs one stable, machine-readable score per candidate; the
  solver exposes the pieces (per-check booleans, per-pair transfer costs) but not an
  aggregated contract.
- **Decision:** Define `LevelFitness`
  ([src/solver/types/LevelFitness.ts](../../src/solver/types/LevelFitness.ts)) = `gates`
  (charactersReachable / itemsReachable / noAnachronisms / ok) + `counts` + `unreachable` lists +
  `anachronisms` detail + `complexity` aggregates (total/reachable/unreachable pair counts,
  max/mean cost, cost histogram). `buildLevelFitness(SolveResult)` is pure and unit-tested;
  `scripts/evaluateLevel.ts` is the I/O shell that adds the `loaded` / `error` envelope.
- **Consequences:** Gives the verdict booleans + integer complexity. The `noAnachronisms` gate +
  `anachronisms` detail were added by DR-016. The G1 `loads` gate is represented by the CLI envelope
  (`loaded:false` + `error`), not inside the pure function. Mean cost is rounded to 2 dp for stable JSON.
- **Alternatives rejected:** emitting raw `SolveResult` JSON (verbose, no aggregates);
  adding flags to the solver core (unnecessary — aggregation is a thin adapter).

### DR-009 — Generated candidates are flat `_gen.*.md` files, not a `_gen/` subdirectory
- **Date:** 2026-06-14 · **Status:** Accepted (supersedes the initial `_gen/` subdirectory)
- **Context:** The first cut stored candidates in `public/levels/_gen/`. They scored fine via
  `npm run evaluate` (CLI `loadLevelFromFile`, which accepts a subdir path) but **failed to load in
  the app**: `loadLevelFromUrl` → `_levelUrlToFilename` collapses a URL to its last segment, and
  `loadLevelTextWithSourceLineMap` rebuilds it as `/levels/<filename>` via `validateFilename`, which
  forbids directory separators (ADR 010). So `/levels/_gen/three_blind_mice.md` was re-fetched as
  `/levels/three_blind_mice.md` → 404 → SPA `index.html` → the misleading "missing required map
  section".
- **Decision:** Store candidates as **flat** `public/levels/_gen.<slug>.md` files. Flat filenames
  round-trip through the existing filename-based loader, so the **CLI scorer and the app load the same
  file the same way** (closing a validator/app divergence). The dev-gen index lists `_gen.*.md`;
  `.gitignore` ignores `public/levels/_gen.*`.
- **Consequences:** No change to core loading / `validateFilename` / ADR 010 — we conform to the
  flat-filename invariant rather than fight it. Candidates sit alongside real levels, namespaced by
  the `_gen.` prefix and excluded from `levels.md`.
- **Alternatives rejected:** teaching the loader + `validateFilename` to accept a `_gen/` subdir
  (invasive, violates ADR 010, touches all level/import loading); a dev middleware mapping a flat URL
  to a subdir file (magic, fragile).

### DR-010 — A dedicated `game-conclusions` agent; CLI scorer matches the app's load strictness
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** The Phase 1 builder authored conclusions inline and produced a cloze whose character
  blank used the `##` heading (`[Dame Hartwell]`) instead of the character's title. The **app** rejected
  it ("missing conclusion answer phrases from conclusion categories"), but `npm run evaluate` accepted
  it — `loadLevelFromFile` didn't pass `validateUnlockPhrases:true`. Another validator/app divergence
  (cf. DR-009).
- **Decision:** (1) `loadLevelFromFile` (used by `solve` + `evaluate`) now loads with
  `validateUnlockPhrases:true`, so the CLI scorer rejects exactly what the app rejects. (2) Add a
  dedicated **game-conclusions** specialist (pipeline stage 6) that owns the `# Conclusions` section: an
  **explicit `## Identities`** plus cloze conclusions and their answer categories, grounded in the
  story, with every cloze answer a category member (character/room/item blanks use the **title**). The
  `/world-test` semantic validator (Phase 2) then judges inferability and flags conflicting / ambiguous
  solutions.
- **Consequences:** Conclusion authoring is a focused, separately-validated stage; Identities is always
  present so other conclusions can be layered on. CLI/app load parity removes another class of "passes
  `evaluate`, fails in the app" surprises.
- **Alternatives rejected:** leaving conclusions to game-scout/game-cron (diffuse, under-validated);
  keeping `evaluate` lenient (defeats the purpose of a structural validator).

### DR-011 — Hub-and-spoke agents: no lateral subagent calls; vertical sub-delegation allowed
- **Date:** 2026-06-14 · **Status:** Accepted
- **Decision:** The coordinator is the only hub. **No specialist subagent calls a sibling specialist**
  (no lateral / peer / subagent↔subagent communication); all cross-specialist coordination and shared
  state flow through the coordinator. A specialist **may** spawn its own deeper, more-specialised
  subagents to complete the task it was given — those children are **private** to that parent, serve and
  report only to it, and roll up into its single return to the coordinator.
- **Consequences:** The call graph stays a **tree rooted at the coordinator** (no peer mesh); every
  cross-cutting decision is observable in one place; a specialist can be internally decomposed without
  other specialists depending on its internals. Tracked concretely in
  [world-gen-agentic-hld.md](world-gen-agentic-hld.md).
- **Alternatives rejected:** peer-to-peer specialist messaging (opaque mesh, hard to observe/cap);
  forbidding all sub-delegation (would stop a specialist internally decomposing a hard task).

### DR-012 — Pure subagents + a single synthesiser as the sole writer (prompt-based application)
- **Date:** 2026-06-14 · **Status:** Accepted (supersedes the initial whole-md hand-off model)
- **Context:** Initially each specialist returned the *full* updated level md and the coordinator wrote
  once at the end. That entangled domain reasoning with file format, hid transitional states, and
  caused regressions when partial md was handed between agents (the Tinker run's game-cron echoed an
  abbreviated `# Items`).
- **Decision:** Subagents are **pure** — minimal custom inputs, and a custom return ending in a
  **`prompt`** field telling a dedicated **synthesiser** how to apply it. The synthesiser is the
  **only** writer of the level md: the coordinator passes it `current md + one subagent return + an
  identifier`; it applies that return and **writes the file**, returning the updated md; repeat per
  return. Per-agent IO is in
  [`agent-contracts.md`](../../.claude/skills/world-gen/references/agent-contracts.md).
- **Consequences:** Every transition is on disk → testable live (`npm run dev-gen`) as the loop runs;
  domain agents never touch file format — the synthesiser resolves cross-references (owner→character
  id, `activeCharacter`→id, cloze answer→title); partial-md hand-off regressions disappear.
- **Alternatives rejected:** each agent writes its own section (multiple writers → races / format
  drift); coordinator writes only at the end (no live testing; hand-off regressions).

### DR-013 — Parallelise truly-independent subagents
- **Date:** 2026-06-14 · **Status:** Accepted
- **Decision:** Subagents needing the *same* input (and not a prior modified md) are spawned
  concurrently. Identified groups: **wave 2** = {architect, scout, itemiser} (input = `story`);
  **wave 3** = {cron, conclusions} (input = `story` + the integrated md). story-teller is the solo
  root. The synthesiser stays serialized (one return per call).
- **Consequences:** Wall-clock savings, and it *forces* minimal-input contracts — an agent that needs
  a sibling's output can't be in the same wave. Judgment call: itemiser parallels scout because the
  `story` already names item↔character associations (the synthesiser resolves owners at apply time).
- **Alternatives rejected:** a strictly sequential pipeline (slower; tempts over-broad inputs).

### DR-014 — Validator-coordinator sub-hub + human-in-the-loop termination
- **Date:** 2026-06-14 · **Status:** Accepted
- **Decision:** A dedicated **validator-coordinator** (spawned by the main coordinator — the DR-011
  vertical sub-delegation pattern) solely runs the solver + world-test and owns the **capped** tweak
  loop, calling wave subagents → synthesiser for fixes. It routes human-input requests **up** to the
  main coordinator (the single human interface), which asks via `AskUserQuestion` and passes the answer
  down. The run terminates only when the **human confirms** satisfaction; every transitional state is
  written for live testing.
- **Consequences:** Validation/tweak logic + the iteration cap live in one place; generate (waves) and
  validate/steer (validator-coordinator) are cleanly separated; the user reviews real, on-disk states.
- **Alternatives rejected:** the main coordinator validating inline (mixes concerns — the earlier ≤3
  inline repair was a stopgap); auto-terminating on `gates.ok` (skips human judgement of playability).
- **Status update (2026-06-14):** Refined by **DR-017**. The validator-coordinator no longer writes the
  canonical md or routes fixes straight through the synthesiser — it runs a **dual-oracle accept-if-better**
  loop, evaluates each delta on a **scratch** candidate, and **returns the accepted-improvement ledger**
  to the coordinator, which writes the canonical md via the file-writer and owns the human gate.

### DR-015 — story-critic: the story-teller's internal quality gate (first vertical sub-delegation)
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** The story conditions every downstream agent (rooms, cast, items, timeline, conclusions),
  so a thin or incoherent story poisons the whole run. We want a publisher-grade story *before*
  generation proceeds.
- **Decision:** The **story-teller** spawns its own **private `story-critic`** subagent (the DR-011
  vertical sub-delegation pattern — first realized use) and loops: draft → critic scores it (plot,
  flow, intrigue, historical/setting accuracy, characters, denouement) → apply the critic's
  `improvements` → re-score. The story-teller **returns to the coordinator only a story the critic has
  `accept`ed** (or its best draft once the critic-loop cap is hit, flagged as short). The critic is
  pure (scores + advice; no file writes) and invisible to the coordinator.
- **Consequences:** Story quality is enforced at the source, lifting every downstream stage; it is the
  first concrete vertical sub-delegation (validates the DR-011 pattern). Capped to avoid runaway.
- **Alternatives rejected:** the coordinator critiquing the story (mixes concerns — the critic is the
  story-teller's own tool); no critic at all (thin stories degrade the whole pipeline — the recurring
  too-easy / too-shallow results trace back to under-developed stories).

### DR-016 — Extend the solver core: timeline-end co-presence sample + anachronism gate
- **Date:** 2026-06-14 · **Status:** Accepted (qualifies DR-006)
- **Context:** Two validation-correctness gaps surfaced while generating. (a) A generated maid touring
  four rooms by **absolute** timestamps was reported to strand the two characters in her **last** room.
  Root cause was in the solver, not the level: co-presence sampled at each `ROOM_ENTRY`'s `startTime`,
  but `findCharacterPose` at that instant resolves to the room being *left*, so a tour's final room is
  never observed. (b) The loader can silently mis-schedule an **absolute** activity *before* a
  relative-`:`-speech-drifted clock (its blocking check scores speech as non-blocking for absolute
  timestamps), leaving a character "in two places at once" with no load error — an anachronism the user
  asked the solver to detect via both `solve` and `evaluate`.
- **Decision:** Extend the solver core (not just an adapter): (1) add a **timeline-end sample**
  (`findTimelineEndTime`, [timelineUtil.ts](../../src/solver/timelineUtil.ts)) to both the co-presence
  and room-occupancy samplers — the final settled state where every character rests in the room they
  last entered; (2) add **anachronism detection** ([anachronismUtil.ts](../../src/solver/anachronismUtil.ts))
  — per character, two **same-channel** activities (movement / speech / emit / hands) whose spans
  overlap; talking while walking is allowed (different channels), two overlapping walks is a fault.
  `SolveResult.ok` now also requires `noAnachronisms`; both `solve` (ASCII block + JSON) and `evaluate`
  (gate `G3b` + `anachronisms` detail) surface it.
- **Consequences:** The maid's last room now registers (the gen level went 4/6 → 6/6 reachable, all
  items reachable); the three authored levels still pass with zero anachronisms (talking-while-walking
  in `02_house_of_rocks` validated the channel split). Qualifies DR-006: adapter-only holds for derived
  *metrics*, but a missing *verdict* justifies a core change. See adr-solver §2, §6a, §6c.
- **Alternatives rejected:** hand-patching the gen level (it is gitignored scratch — the system must be
  correct, not the artifact); cross-channel overlap detection (false-flags legitimate talking while
  walking); fixing the loader's blocking check instead (changes scheduling semantics broadly — riskier
  than a read-only solver check, and the solver is where the user wanted the signal surfaced).

### DR-017 — Validator-coordinator: a dual-oracle, accept-if-better improvement engine
- **Date:** 2026-06-14 · **Status:** Accepted (supersedes the inline-repair part of DR-014; makes the
  game-gen strategist of §6/§8 concrete)
- **Context:** DR-014 sketched the validator-coordinator as a capped solver/world-test *repair* loop that
  routed fixes straight through the synthesiser. We want more than repair: the validator should **use
  both oracles to drive iterative improvement**, keep a change **only when it measurably helps**, and
  leave the **canonical write + the human gate to the main coordinator**.
- **Decision:** The validator-coordinator runs a bounded loop and **returns accepted improvements; it
  never writes the canonical md.**
  1. **Score with both oracles** — the **solver** (`evaluate` → gates + complexity) and the **world-test**
     subagent (structured Identities inferability / per-conclusion difficulty / conflicts) — into one
     **combined fitness**. Comparator: candidate B beats A iff B fixes ≥1 failing gate without breaking
     another, or (gates equal) B's soft score is strictly higher (soft = complexity in the target band +
     world-test difficulty balance + breadth + story coherence).
  2. **Diagnose → route.** A fixed **fault/opportunity → agent** table (failing gate or weak signal →
     the wave subagent that owns that area) — full table in
     [`agent-contracts.md`](../../.claude/skills/world-gen/references/agent-contracts.md) under
     *validator-coordinator*. E.g. `noAnachronisms:false`/co-presence → **game-cron**; Identities `none`
     → **game-scout**; `too-easy` → game-scout/game-conclusions; `unreachable.itemIds` → game-cron/
     game-itemiser; `loaded:false` → game-conclusions/named section.
  3. **Test on a scratch candidate.** The **file-writer** applies the proposed delta to a throwaway
     `_gen.<slug>.try.md`; **both** oracles re-run on it.
  4. **Accept-if-better.** Keep the delta only if combined fitness strictly improves and **no gate
     regresses**; else discard and try another fix/agent. Accepted deltas accumulate in a **ledger**.
  5. **Aggregate & return** `{ status, finalFitness, worldTestFindings, improvements (ledger),
     recommendedApplyOrder, humanQuestion? }` to the **coordinator**.
- **Coordinator writes; coordinator asks.** The coordinator applies the accepted `improvements` (in
  `recommendedApplyOrder`) to the **canonical** `_gen.<slug>.md` via the **file-writer** (the synthesiser
  — one call per improvement, each written for live testing). If the validator returns a `humanQuestion`
  (or its data is ambiguous on how to proceed), the coordinator **asks the user** (`AskUserQuestion`)
  first, optionally re-invoking the validator with the answer as `direction`.
- **Invariant preserved.** The **file-writer is the sole writer of any md** — the validator's scratch
  candidate *and* the coordinator's canonical write both go through it; the validator only orchestrates +
  scores. This is the §8 hill-climb made concrete: the validator-coordinator is the strategist+validator,
  accept-if-better is the acceptance rule, the ledger is the memory.
- **Consequences:** Changes that don't help are never written; both structural *and* semantic quality
  improve each round; the human stays in control of the canonical artifact and of ambiguous calls.
- **Alternatives rejected:** validator writes the canonical md directly (removes the coordinator's write
  + user gate the user asked for); accept-any-change (drifts/regresses without the better-than test);
  solver-only (misses semantic gaps world-test catches, and vice-versa).
- **Status update (2026-06-14):** Restructured by **DR-019**. The dual-oracle analysis + routing table
  live on in the standalone **`world-fix`** decider, but the *implementing* half (scratch writes,
  accept-if-better ledger) is replaced by world-gen's **gate-until-READY** loop. world-fix decides;
  world-gen implements.

### DR-018 — Verbose / debug mode: stream the full agentic trace
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** The pipeline is many nested agent calls (waves, the story-critic loop, the
  validator-coordinator's per-iteration accept-if-better loop). Default narration shows headlines only;
  a developer debugging *why* a level came out as it did needs to see every call, every return, and —
  above all — the **validator's reasoning** over the solver + world-test outputs.
- **Decision:** Add a `--verbose` (`--debug` / `-v`) flag to `/world-gen`. When set, the coordinator
  streams: (1) every **agent → agent call** with its input; (2) every **return** with its value (paired,
  indented by call depth, parallel waves marked, long free-text abbreviated-with-length not dropped);
  (3) the **validator-coordinator's per-iteration think-aloud** — solver result, world-test result,
  combined fitness, diagnosis → routing (with the *reason*), the proposed delta, the scratch re-check,
  and the ACCEPT/REJECT decision and why; (4) the **coordinator's delegation** of each accepted
  improvement to the file-writer + any `AskUserQuestion`. Off by default. Trace format lives in the
  skill's *Verbose / debug mode* section.
- **Consequences:** A developer can audit the whole decision chain; the format mirrors the HLD call
  graph, so the trace reads as a live instance of it. Verbose **never changes behaviour** — it only
  exposes it (a skipped call, rejected delta, or re-routed fix must appear in the trace).
- **Alternatives rejected:** always-verbose (noise for normal use); a separate post-hoc log file only
  (the user wants it inline, live, while the run happens).

### DR-019 — Extract the validator into a standalone `world-fix` skill (read-only decider)
- **Date:** 2026-06-14 · **Status:** Accepted (supersedes the *implementing* role of DR-017's
  validator-coordinator; keeps DR-017's dual-oracle + routing as world-fix's analysis)
- **Context:** DR-017's validator-coordinator both *analysed* (solver + world-test) and *implemented*
  (scratch writes, accept-if-better, returned a ledger). Conflating decide + implement made it heavy and
  un-reusable. We want the validator usable **on its own** — a game architect should be able to point it
  at any level and get a tailored fix list — and we want generation to gate on it the way the
  story-teller gates on the story-critic.
- **Decision:** Split them. **`world-fix`** is a separate, **read-only** skill (`/world-fix <levelFile>`,
  file arg mandatory): it runs the **solver** and the **world-test** (player) check and returns a
  **prioritised TODO** (`items:[{severity, area, issue, fix, evidence}]`) + a **verdict**
  `READY`/`NEEDS-WORK`. It **never edits anything and never calls the wave agents** — it only decides and
  advises (the structural+semantic analogue of the story-critic). **`world-gen`** becomes the sole
  implementer: it loops `world-fix → implement each must-fix via the owning wave agent → file-writer
  (canonical) → re-run world-fix` until `READY` (or `maxIterations`). The accept-if-better/scratch
  machinery of DR-017 is dropped in favour of this **gate-until-READY** loop (the loop self-corrects — a
  regression is just flagged on the next pass), mirroring story-teller↔story-critic.
- **Consequences:** Clean separation of *decide* (world-fix) from *implement* (world-gen); world-fix is
  independently useful (architects, CI triage, a pre-commit check); the sole-writer invariant is
  untouched (world-fix writes nothing; the file-writer still writes). `READY` is the single "is this
  level done?" verdict. world-test's structured-oracle contract (DR-017) is reused as world-fix's semantic
  half. Caps move to the **caller** (world-gen owns the iteration cap).
- **Alternatives rejected:** keeping analyse+implement fused (not reusable, heavy); world-fix that also
  edits (breaks the sole-writer invariant and the standalone advisory use the user asked for);
  keeping the scratch/accept-if-better hill-climb (more machinery than the gate-until-READY loop needs).

---

## 14. Iteration history (what worked / what didn't)

Empirical learnings from actually running the system. Append dated entries as we go. (Seed
— nothing run yet.)

| Date | What we tried | Result | What we changed |
|---|---|---|---|
| 2026-06-14 | — | Design accepted | — |
| 2026-06-14 | Built Phase 0 scoring; ran `evaluate` on `01_birth_of_constantine.md` | Works: 18 chars / 8 items all reachable, `maxCost 2`, `meanCost 0.88`, histogram `{0:52,1:57,2:35}`. Existing levels skew **shallow** (most clues 0–1 switches deep) | Recorded as the baseline for the complexity target band; defer setting the band until we have generated examples to compare |
| 2026-06-14 | Phase 1 one-shot run: story-teller + builder agents → `three_blind_mice.md` | Loads & solves (`gates.ok:true`, 6 chars / 4 items reachable) but trivially **shallow**: `meanCost 0.08`, `maxCost 1` — the builder converges the whole cast in one room, so most items are cost 0. The builder needed 3 repairs and exposed 3 wrong/missing contract rules | Fixed the authoring contract (normalizeId is `trim+lowercase` only; room-grid width = map-tiles×4 by 3 rows; exits are horizontal-only; characters must be **placed** in a grid to exist). Shallow complexity confirms Phase 3 (optimization) is where depth must be engineered |
| 2026-06-14 | Loaded the generated level in the app via the new `(GEN)` tab | **Failed**: "missing required map section" despite the level having a `# Map`. Root cause: the `_gen/` **subdirectory** doesn't round-trip through the app's filename loader (`loadLevelFromUrl` drops the subdir; `validateFilename` forbids `/`), so the app fetched the wrong path → `index.html`. `evaluate` (CLI) passed because it loads via a subdir-tolerant path — a validator/app divergence | Switched candidates to **flat** `_gen.*.md` files under `public/levels/` (DR-009); CLI scorer and app now load the identical file. Reinforced `# Map` as required in the authoring contract |
| 2026-06-14 | Loaded the (flat) level in the app | **Failed** at conclusion validation: "missing conclusion answer phrases … Dame Hartwell" — the cloze used the character's `##` heading, but the `characters` category holds **titles**. `evaluate` had passed it because the CLI loader skipped `validateUnlockPhrases` | Made `loadLevelFromFile` load with `validateUnlockPhrases:true` (CLI now matches the app — it now *catches* this); added a dedicated **game-conclusions** agent + contract rule (cloze answers must be category members; character/room/item blanks use the title); always emit an explicit `## Identities` (DR-010). Patched the demo cloze to `[The Farmer's Wife]` |
| 2026-06-14 | First full **6-stage** `/world-gen` run on a new prompt — "Tinker, Tailor, Soldier, Spy" → `_gen.tinker_tailor_soldier_spy.md` ("The Brazen Thimble", 6 chars / 6 items) | Loads & solves (`gates.ok:true`, all reachable) after 2 coordinator repairs. Findings: (a) handing a stage an *abbreviated* candidate made game-cron echo a stub `# Items` — the coordinator must carry the FULL candidate between stages; (b) mixing absolute + relative itinerary timestamps caused a `says` overlap (a long line ran past the next absolute beat); (c) **relative `:` movements did not register solver co-presence** — Tinker→Kitchen and Spy→Taproom never linked, leaving them unreachable | Coordinator reassembles the full candidate (never abbreviate on hand-off); made the itinerary strictly sequential (`:`) to kill `says` overlap; anchored connectivity on **level-start co-presence** (whole cast co-present in the Taproom + every item carried) → `meanCost 0` (trivially shallow). **TODO:** investigate why relative-movement co-presence isn't sampled, or have game-cron rely on level-start / absolute-timestamp co-presence |
| 2026-06-14 | First run of the **revised architecture**, waves 1–2 only — "Sing a Song of Sixpence" → `_gen.sing_a_song_of_sixpence.md` (Tudor treasury-theft, 6 chars / 8 items) | The story-teller's **story-critic loop worked for real** (it spawned the critic via the Agent tool; 2 rounds revise→accept, scores ≈8–9). Wave 2 (architect ∥ scout ∥ itemiser) ran **in parallel**, each returning **pure data + an apply-`prompt`** (no file writes); the synthesiser applied them and the wave-2 state **loads** (distinct real faces). As designed, `gates.ok:false` at wave 2 (no `# Itinerary` yet → only the active char's room is co-present) | Confirms the new **story-critic / pure-subagent / parallel-wave / synthesiser** mechanics work end-to-end through wave 2. Wave 3 (cron ∥ conclusions) is what connects the cast + adds the puzzle. (Vertical sub-delegation DR-015 + DR-012/013 validated in practice) |
| 2026-06-14 | Wave 3 on Sing a Song of Sixpence (cron ∥ conclusions) — Margery's investigative **movement tour** Garden→Parlour→Kitchen→Counting House | **Movement co-presence WORKS with absolute timestamps** (resolves the Tinker open question): the tour linked the Blackbird, Queen and Baker → `meanCost 0.38`, `maxCost 1` — *real depth* vs the trivial `0`. The level loads with the full Identities + cloze puzzle. **But the final/far room (Counting House: King, Steward) never registers** Margery's visit — reproduced identically (26/48) across a trailing move, 3-min spacing, AND a hyphen→space room rename. Also: game-cron emitted invalid activity verbs (`startles`/`glances`/`paces`) + character-parentheticals the synthesiser had to conform | Absolute-timestamp tours create depth — adopt them over the trivial all-in-one-room. **Open finding (TODO):** the active char's tour doesn't link its *last/far* room; needs a dedicated solver-sampling investigation, not a gen fix. **Constrain game-cron** to the itinerary activity grammar. Left at 4/6 reachable pending that investigation or a level-start-co-presence fallback |
| 2026-06-14 | First **`--verbose`** end-to-end run (DR-018) + first **dual-oracle accept-if-better** validator loop (DR-017) — "Inception" prompt → `_gen.inception.md` ("Inception: One Idea Deep", 7 chars / 7 items; descent Airliner→Hotel→Vault) | Generation passed the solver first try (Dom's descent links all 7 via absolute arrivals — DR-016 final-room fix held). The **validator earned its keep**: the world-test oracle caught that the **`# Conclusions` append had been silently clobbered** by an external linter write between two Edits (solver couldn't see it — Identities is implicit), and the solver caught **7→6 items** because game-cron dropped Dom's **Spinning Top Totem** at `(0,0,0)` (outside any room). Accept-if-better fixed both on a scratch candidate (items 6→7, +2 solvable clozes, gates held, `meanCost 0.57→0.49`) before the coordinator wrote canonical. world-test also flagged Identities **too-easy** (every role spelled out in description AND speech AND item) — logged, deferred to human steering. game-cron **again** emitted invalid verbs (`taps his watch`, `thumbs the pinwheel`) the file-writer had to conform | **Lesson: never trust an append survived — write the full file atomically** (the clobbered `# Conclusions` only resurfaced via world-test; a full Write persisted where the Edit didn't). The dual-oracle pairing is load-bearing: the solver missed the clobbered conclusions (implicit Identities still passed) and world-test missed nothing — each caught what the other couldn't. **Still TODO: constrain game-cron to the activity grammar** (now 3 runs in a row it emitted invalid verbs) and add a difficulty knob so identities aren't triple-redundant by default |

Use this table for: cap tunings (B/N/R/P) and their effect; mutation classes that
reliably help vs waste budget; prompts/schemas that produced invalid levels; solver/
world-test disagreements and how we resolved them; generative successes worth keeping as
fixtures.

---

## 15. Risks & open questions

- **PR merge style (DR-001 caveat).** If the upstream PRs are squash/rebase-merged,
  `world-gen` needs a reconciliation pass. Track until the PRs land.
- **Format breakage.** Free-form Markdown patches may produce unloadable levels; relying
  on the loader as linter + bounded repair. Watch the repair-success rate (Iteration
  History).
- **Semantic-oracle non-determinism.** `/world-test` is model judgment; scores will vary
  run-to-run. Consider seeding / caching per candidate hash, and treating its output as a
  band, not a point.
- **Complexity target band, not maximization.** Maximizing transfer cost can make levels
  unsolvable-feeling; we steer toward a band. The band's bounds are unknown until we have
  playtested examples — an Iteration-History question.
- **Import resolution for candidates.** Resolved by storing candidates as flat
  `public/levels/_gen.*.md` files (DR-009): `imports=` resolve relative to `public/levels/`, and the
  flat names round-trip through the app loader. Excluded from `levels.md`, so the app lists them only
  under `npm run dev-gen`.
- **Budget accounting across substrates.** When a round uses a Workflow, ensure its token
  spend is visible to the skill's per-session budget view.

---

## Appendix A. Level authoring contract (summary)

The concise format reference the specialist agents are fed. Source of truth is the loader
code; this is a digest. Sections of a level file (split by `#` headings):

- **General** — `* name=value` bullets: `title` (required), `activeCharacter`,
  `startTime`/`time` + optional `endTime` (may wrap midnight), `background=<file>.png`,
  `imports=items.md | characters.md`, `winSynopsis`, optional `discoverable*Count`.
  ([levelUtil.ts](../../src/levelLoading/levelUtil.ts))
- **Map** — one fenced code block grid; `.` empty; every other char defined in a `* C=Room
  Title` legend; rooms must be rectangular.
  ([levelRoomLayoutLoader.ts](../../src/levelLoading/levelRoomLayoutLoader.ts))
- **Rooms** — `## Room` subsections with an optional 3-row grid (`* C=Entity | Entity`) and
  `* exits=Room | Room (modifier)`; exit modifiers: `open|closed|locked|unlocked|lockable|
  unlockable`, plus `lockable with <Item>`.
- **Characters** — `## Name` → ID (normalized); `* title=`, `description`, `faceImage=<file>.png`,
  `facing=left|right`, `orientation=standing|sitting|laying`, `items=A | B`, `alive=`,
  `isTitleKnown=` (default `false` → identity hidden).
  ([levelRoomPopulationLoader.ts](../../src/levelLoading/levelRoomPopulationLoader.ts)).
  For dev, assume `<charactername>.png` exists per character.
- **Items** — `## Name` → ID; `* title=`, `description`, `image=<file>.png`, `drawOffset{X,Y,Z}`.
- **Itinerary** — `HH:MM:SS` (or `HH:MM`) absolute, or `:` relative (after prior activity
  completes) lines: `@ Room[.PERCENT%]`, `says "…"`, `interrupts "…"`, `thinks "…"`,
  `faces left|right`, `stands|sits|lays`, `takes/gives/drops <Item>`, `dies`, `(narrator
  note)`. A `:`-prefixed line applies to the most recently named character. `says` errors
  on audible overlap; use `interrupts` for intentional overlap.
  ([itineraryActivityParseUtil.ts](../../src/levelLoading/itineraryLoading/itineraryActivityParseUtil.ts))
- **Conclusions** — top-level `* category=opt1|opt2` option lists (`rooms`/`items`/
  `characters` auto-populated); `## Conclusion` subsections with `* conclusion=` cloze text
  using `[Category]` or `[ans1|ans2]` blanks, plus `unlockConclusions=` /
  `revealRooms=`. **Identities:** an empty `## Identities` subsection auto-generates one
  blank per interactive character.
  ([levelConclusionsLoader.ts](../../src/levelLoading/levelConclusionsLoader.ts))

Validation must-respect: unique normalized IDs; referenced IDs must exist; no overlapping
speech for a single character; rectangular rooms; consistent exit modifiers.

---

## Changelog

- **2026-06-14** — Document created. Design accepted (DR-001…DR-007). Hybrid substrate
  chosen. Phase 0 pending. No runs yet.
- **2026-06-14** — Merged `death-to-the-orient` doc cleanup into `world-gen` (DR-001).
  Reframed terminology: a generated level is a **narrative level** (a self-contained story
  within a level's context boundary, per `public/levels/xx_level.md`), not specifically a
  "murder-mystery" — that is the game's overall framing, not a per-level constraint.
- **2026-06-14** — Phase 0 (structural-oracle scoring) implemented: `LevelFitness` +
  `buildLevelFitness` + complexity aggregates + `scripts/evaluateLevel.ts`
  (`npm run evaluate`) + `public/levels/_gen/` scratch dir (DR-008). Typecheck clean, 53
  solver tests pass, verified on a real level.
- **2026-06-14** — Phase 1 (one-shot generator pipeline) implemented & validated: `/world-gen`
  skill + authoring-contract reference; a real story-teller→builder run produced a loadable,
  solver-passing Three Blind Mice level (`_gen/three_blind_mice.md`, `meanCost 0.08`). Corrected the
  authoring contract from run learnings (grid width, horizontal-only exits, `normalizeId`, placement).
- **2026-06-14** — `.gitignore`d `public/levels/_gen/` (kept `.gitkeep`; untracked the demo
  `three_blind_mice.md`) — generated level candidates are scratch, not committed.
- **2026-06-14** — Authoring-contract correction (user feedback): exits are always *horizontal*, but
  one room may have several exits on its east/west side — multi-storey levels connect floors via a tall
  staircase room (two same-side exits), not via vertical exits.
- **2026-06-14** — Fixed app load of generated levels (DR-009): a `_gen/` **subdirectory** didn't
  round-trip through the app's filename-based loader (surfaced as "missing required map section").
  Switched candidates to **flat** `public/levels/_gen.*.md` files so the CLI scorer and app load
  identically; updated dev-gen, manifest, skill, `.gitignore`, and the contract accordingly.
- **2026-06-14** — Conclusion-phrase parity + agent (DR-010): `loadLevelFromFile` (solve/evaluate) now
  loads with `validateUnlockPhrases:true`, so the CLI scorer rejects cloze answers missing from
  conclusion categories — exactly as the app does. Added a `game-conclusions` pipeline stage and
  contract rules (cloze answers must be category members; character/room/item blanks use the title;
  always an explicit `## Identities`).
- **2026-06-14** — Generated characters now use a **distinct real face** from `public/assets/faces/`
  (~37 available) so levels render for playtesting (game-scout + authoring contract).
- **2026-06-14** — Agentic communication invariant (DR-011): hub-and-spoke — no lateral
  subagent↔subagent calls (all coordination via the coordinator); vertical sub-delegation (a
  specialist's own private deeper subagents) is allowed. Documented in the agentic HLD.
- **2026-06-14** — First full 6-stage `/world-gen` run on a fresh prompt ("Tinker, Tailor, Soldier,
  Spy") → `_gen.tinker_tailor_soldier_spy.md` ("The Brazen Thimble"), loadable + solver-passing.
  Learnings logged in Iteration History: carry the full candidate between stages (no abbreviation);
  sequential `:` itinerary to avoid `says` overlap; **relative `:` movements didn't register solver
  co-presence** — anchored solvability on level-start co-presence (cast co-present in the Taproom,
  items carried).
- **2026-06-14** — Revised the generation architecture (DR-012/013/014): **pure** subagents (minimal
  custom inputs; return data + an apply-`prompt`); a single **synthesiser** as the sole writer of the
  level md (one return per call, writing every transition for live testing); **parallel** independent
  subagents (wave 2 = architect/scout/itemiser; wave 3 = cron/conclusions); a **validator-coordinator**
  sub-hub owning the capped solver/world-test tweak loop with human-in-the-loop termination. Rewrote the
  HLD + skill; added `references/agent-contracts.md` (per-agent IO).
- **2026-06-14** — Added **story-critic** (DR-015): the story-teller now runs a private, capped critic
  loop (plot / flow / intrigue / accuracy / characters / denouement) and returns only a critic-accepted
  story — the first realized vertical sub-delegation (DR-011). Updated contracts, HLD, skill, topology,
  fitness, and caps.
- **2026-06-14** — Solver core extended (DR-016): (1) **timeline-end co-presence sample**
  (`timelineUtil.findTimelineEndTime`) closes a final-room blind spot — a maid touring four rooms by
  absolute timestamps never registered in her last room (the gen `_gen.sing_a_song_of_sixpence.md` went
  4/6 → **6/6** characters + 8/8 items reachable, `meanCost` 0.38 → 0.60); (2) **timeline-anachronism
  detection** (`anachronismUtil`, same-channel overlap) added to `SolveResult.ok`, `solve` (ASCII +
  JSON) and `evaluate` (gate `G3b` `noAnachronisms` + `anachronisms` detail). The three authored levels
  pass with zero anachronisms (talking-while-walking in `02_house_of_rocks` validated the channel
  split). New unit tests; adr-solver + CLAUDE.md updated.
- **2026-06-14** — Validator-coordinator made concrete (DR-017): a **dual-oracle accept-if-better**
  improvement loop. It scores each candidate with **both** the solver and the **world-test** subagent
  (now a structured semantic oracle), routes faults/opportunities to the owning wave subagent via a
  fixed table, tests each delta on a **scratch** candidate, and keeps it only if combined fitness
  strictly improves with no gate regression. It **returns the accepted-improvement ledger** to the
  coordinator (never writes the canonical md); the **coordinator** writes via the **file-writer** and
  **asks the user** when the validator returns a `humanQuestion` or ambiguous data. Updated
  agent-contracts (validator-coordinator + new world-test oracle contract), SKILL, topology, §7 fitness
  (acceptance rule), §8 loop.
- **2026-06-14** — Added **verbose / debug mode** (DR-018): `/world-gen --verbose` streams the full
  agentic trace — every agent call + return (indented by depth, parallel waves marked), the
  validator-coordinator's per-iteration reasoning over the solver + world-test outputs (diagnosis →
  routing → delta → scratch re-check → accept/reject + why), and the coordinator's delegation of each
  accepted improvement. Off by default; never changes behaviour. SKILL gains a *Verbose / debug mode*
  section; §9 observability + HLD note updated.
- **2026-06-14** — Hardened verbose mode after a live test: the trace must use a **uniform
  `[AGENT|IN]`/`[AGENT|CALL]`/`[AGENT|OUT]` format with FULL untruncated JSON**, and the **caller echoes
  each callee's IN before the call + OUT after** (so lines are visible even if a call is interrupted, not
  only buried in a returned tool result). SKILL *Verbose / debug mode* rewritten accordingly.
- **2026-06-14** — First `--verbose` end-to-end run + first dual-oracle accept-if-better loop, on the
  "Inception" prompt → `_gen.inception.md` (7 chars / 7 items, descent Airliner→Hotel→Vault, `gates.ok`,
  `meanCost 0.49`). The validator caught two real defects the **solver alone would have missed**: a
  `# Conclusions` append silently clobbered by an external linter write (only world-test saw the cloze
  layer was gone — Identities is implicit), and Dom's Spinning Top Totem dropped at `(0,0,0)` falling out
  of play (7→6 items); both fixed accept-if-better on a scratch candidate before the canonical write.
  Lessons logged in Iteration History: **write full files atomically (appends can be clobbered)**, the
  two oracles are complementary, and game-cron still needs grammar-constraining (invalid verbs a 3rd run).
- **2026-06-14** — Extracted the validator into a standalone **`world-fix`** skill (DR-019). world-fix is
  **read-only** (`/world-fix <levelFile>`, mandatory): it runs the solver + world-test and returns a
  prioritised fix TODO + a `READY`/`NEEDS-WORK` verdict — it never edits and never calls the wave agents.
  **world-gen** now loops `world-fix → implement each must-fix via the owning wave agent → file-writer →
  re-run world-fix` until `READY` (the story-critic pattern, applied to playability), replacing DR-017's
  scratch/accept-if-better machinery. Lets a game architect run world-fix independently for a tailored
  fix list. Created `.claude/skills/world-fix/SKILL.md`; updated world-gen SKILL, agent-contracts
  (validator-coordinator contract → world-fix), topology, §8 loop, and DR-017's status. HLD updated.
- **2026-06-14** — Renamed the **`play-game` skill → `world-test`** (the semantic/player oracle), so the
  trio reads as one family: **world-gen** (generate) · **world-fix** (decide) · **world-test** (play).
  `git mv` of `.claude/skills/play-game` → `world-test`; all references updated across both design docs,
  all three skills, `agent-contracts.md`, `CLAUDE.md`, `docs/design/README.md`, and the
  `LevelFitness.ts` / `evaluateLevel.ts` comments (the `playGame` JSON field → `worldTest`). No
  behaviour change — pure rename.
- **2026-06-15** — `/world-gen --verbose` run on the "Paws & Pistons" prompt (animal heist on a 1926
  luxury train) → `_gen.paws-and-pistons.md` (8 chars / 6 items, 5 linear train cars, `gates.ok`,
  `meanCost 0.63`, world-test 8/8 identities + both clozes just-right). **New, important co-presence
  learning** that cost 3 wasted fix loops before reading `characterGraphUtil.ts`: when the **active
  character is the *only* mover** (all NPCs stationary, doing dialogue-only itineraries), the solver's
  co-presence sample ticks are *all* the active character's own `ROOM_ENTRY` times — and at a
  `ROOM_ENTRY` instant `findCharacterPose` resolves the mover to the room being **left**, never the one
  being entered. So an absolute arrival `Pip @ LocomotiveCab` does **not** register the mover in that
  cab; and a stationary NPC alone in a room is therefore caught **only** by the **timeline-end** sample
  (the room the active character *last entered*) or by **level-start** co-presence. Fix that finally
  worked: make the touring active character **END the tour inside the otherwise-isolated NPC's room**
  (Pip's finale at the Locomotive throttle) so `findTimelineEndTime` samples them together. The earlier
  tour stops (Parlor/Observation/Baggage) solved fine because each NPC's room *also* happened to be the
  "room being left" at the next absolute arrival — the **last** room of a one-mover tour is the only one
  that needs the timeline-end anchor. Rule added to the game-cron contract. Also re-confirmed: dialogue
  must be `:`-sequenced (an absolute-timestamped back-and-forth tripped the audible-`says`-overlap load
  error on the first pass), and the `: Name activity` speaker-switch syntax (colon first) is a recurring
  synthesiser reconciliation.
