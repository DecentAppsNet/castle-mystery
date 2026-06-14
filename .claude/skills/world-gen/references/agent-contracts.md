# world-gen agent contracts

The **input** and **output** data structures for every world-gen subagent. Two rules hold for all of
them (see the design doc's DR-012 / DR-013 and the agentic HLD):

1. **Each subagent takes only the input it needs for its task** — never "the whole level so far" unless
   its task genuinely needs the integrated entities. Minimal, custom inputs let independent agents run
   in **parallel**.
2. **Each subagent returns a custom structure whose last field is `prompt`** — a natural-language
   instruction telling the **synthesiser** how to apply this return to the level Markdown. Subagents
   **never write files**; only the synthesiser does (DR-012).

Shapes below are illustrative (JSON-ish), not a strict schema. `Story` is the shared context object
the story-teller produces and the coordinator passes to downstream agents.

```
Story = {
  world: string,                       // setting + mood, bounded to ~3-5 rooms
  characters: [{ name, identityTitle,  // identityTitle = the hidden identity the player deduces
                 clues: string[] }],   // witnessable tells for that identity
  rooms: [{ name, connectsTo: string[] }],   // intended adjacency (horizontal)
  items: [{ name, owner }],            // story-relevant objects + their thematic owner (a character/room name)
  whatHappened: string                 // the stageable incident
}
```

---

## story-teller  (wave 1 — root)
- **IN** `{ playerPrompt: string }`
- **OUT** `{ story: Story, prompt: string }`
- **Internal quality gate (vertical sub-delegation).** Before returning, the story-teller spawns its
  own private **story-critic** subagent and loops — draft/revise the story → get it scored → apply the
  critic's suggested improvements — and **only returns a story the critic has `accept`ed** (or the
  best-scoring draft once the critic-loop cap is hit, noting it fell short). The coordinator never sees
  the critic; it receives only the accepted `story`. This guarantees a fully-fleshed story, which every
  downstream agent depends on.
- `prompt` → synthesiser: *create the level file and write `# General` `title`/`winSynopsis` from the
  story.* The rest of `story` is **context** the coordinator passes to wave-2/3 agents — it is **not**
  written into the md.

## story-critic  (private child of story-teller — NOT called by the coordinator)
- **IN** `{ playerPrompt: string, story: Story }`
- **OUT** `{ verdict: "accept" | "revise",
  scores: { plot, flow, intrigue, historicalAccuracy, characters, denouement },  // each e.g. 1-5
  failingMetrics: string[],     // dimensions below the bar
  reasons: string[],            // why each falls short
  improvements: string[] }`     // concrete, actionable edits for the story-teller to apply
- **Sole purpose: judge story quality** by the craft of story-writing — as a book editor/publisher
  would. It writes nothing, never touches the level md, and returns only to its parent (the
  story-teller). It scores and advises; it does not rewrite the story.
- **Rubric — the bar a story must clear to `accept`:**
  - **plot** — a coherent arc: setup → conflict/complication → resolution; stakes that matter.
  - **flow / structure** — characters are *introduced* before they act; rising action; a clear
    **denouement** that ties the threads; a satisfying close; no abrupt jumps.
  - **intrigue** — a hook that **keeps the reader guessing** (tension / an open question / mystery) and
    pays it off — doubly apt here, since the player's job is to *deduce*.
  - **historical / setting accuracy** — period- and world-plausible; internally consistent.
  - **characters** — distinct, motivated people, each with a deducible hidden identity (so downstream
    scout/itemiser/conclusions have real material).
  - **denouement** — the incident resolves in a way that rewards the reader's attention.
  Accept only when every dimension meets the bar; otherwise `revise` with `reasons` + `improvements`.

## game-architect  (wave 2 — parallel · IN = story)
- **IN** `{ story: Story }`
- **OUT** `{ general: { time, background }, rooms: [{ title, mapLetter, connectsTo }], prompt }`
- `prompt` → synthesiser: *write `# Map` (rectangular single-letter blocks, horizontal-only exits) and
  `# Rooms` (each grid exactly 3 rows × map-tiles×4 cols, left empty for placement), and the `# General`
  time/background.*

## game-scout  (wave 2 — parallel · IN = story)
- **IN** `{ story: Story }`  (also lists `public/assets/faces/` itself to pick faces)
- **OUT** `{ characters: [{ idName, title, description, faceImage, startRoomTitle }],
  activeCharacterName, prompt }`
- Each `title` is the hidden identity; `description` carries the clue; `faceImage` is a **distinct real
  file** from `public/assets/faces/`.
- `prompt` → synthesiser: *add `# Characters`; place each character in its `startRoomTitle` grid (a
  legend letter); set `# General` `activeCharacter` to the active character's id.*

## game-itemiser  (wave 2 — parallel · IN = story)
- **IN** `{ story: Story }`
- **OUT** `{ items: [{ title, description, image, owner: { kind: "character"|"room", name } }], prompt }`
- `prompt` → synthesiser: *add `# Items`; for a `character` owner add the item to that character's
  `* items=`; for a `room` owner place it in that room's grid (a legend letter). Resolve owner names to
  the ids/titles already in the md.*

## game-cron  (wave 3 — parallel · IN = story + level md)
- **IN** `{ story: Story, levelMd: string }`  (needs the integrated rooms/characters/items)
- **OUT** `{ itinerary: ItineraryLine[], coPresencePlan: string, prompt }`
  - `coPresencePlan` states how the timeline satisfies solvability (e.g. "whole cast co-present in the
    Taproom at level start; items carried"). **Level-start co-presence is the reliable anchor** —
    relative `:` movements do not register solver co-presence (see Iteration History).
- `prompt` → synthesiser: *write `# Itinerary` from these lines (first line absolute `HH:MM:SS`, rest
  `:` relative to avoid `says` overlap).*

## game-conclusions  (wave 3 — parallel · IN = story + level md)
- **IN** `{ story: Story, levelMd: string }`  (needs character/room/item **titles** for valid answers)
- **OUT** `{ categories: [{ name, options: string[] }], identities: { unlockConclusions? },
  clozes: [{ title, conclusion, unlockConclusions? }], prompt }`
- Every cloze answer must be a category member (character/room/item **titles**, or an author-defined
  category) or the level fails to load.
- `prompt` → synthesiser: *write `# Conclusions` — author categories, an explicit `## Identities`, then
  each cloze `## <title>`.*

---

## synthesiser  (a.k.a. the **file-writer** — SOLE WRITER — DR-012)
- **IN** `{ currentLevelMd: string | null,   // null on the first call → creates the file
  targetFile: string,                          // canonical _gen.<slug>.md, OR a scratch _gen.<slug>.try.md
  subagentIdentifier: "story-teller" | "game-architect" | "game-scout" | "game-itemiser" |
                      "game-cron" | "game-conclusions",
  subagentReturn: <that agent's OUT, including its prompt> }`
- **OUT** `{ levelMd: string }`  **and writes** `targetFile`.
- Applies exactly one subagent's return per call, following its `prompt`, **resolving cross-references**
  against the current md (owner→character id, activeCharacter→id, cloze answer→title). It is the **only**
  agent that writes any md — the **canonical** candidate AND the validator's throwaway **scratch**
  candidate (DR-017). Writes the file every call so each transitional canonical state is testable via
  `npm run dev-gen`.

## play-game  (semantic oracle subagent — read-only · wraps the `/play-game` skill)
- **IN** `{ levelFilename: string }`  (reads the candidate + its imports; **never writes**)
- **OUT** `{
  perCharacter: [{ name, identityInferable: "direct" | "combined" | "none", note }],   // Identities
  perConclusion: [{ name, blanks: [{ value, pool, inferable: "direct"|"combined"|"none", note }],
                   difficulty: "too-easy" | "just-right" | "too-hard" | "unsolvable" }],
  conflicts: [{ description }],          // ambiguous / contradictory solutions a careful player hits
  summary: string }`
- The **semantic oracle**: it returns the `/play-game` analysis as **structured data** (not prose) so the
  validator-coordinator can compare two candidates and route fixes. Read-only, like the skill itself.

## validator-coordinator  (sub-hub — DR-014 / DR-017)
- **IN** `{ levelFilename: string, story: Story, currentLevelMd: string, maxIterations: number,
  direction?: string }`   // `direction` = the human's optional steer for this round
- **OUT** `{ status: "pass" | "needs-human" | "exhausted",
  finalFitness,            // combined solver + play-game score of the best candidate reached
  playGameFindings,        // the structured play-game OUT for that candidate
  improvements: [{ agent, summary, beforeFitness, afterFitness, subagentReturn }],  // the accepted ledger
  recommendedApplyOrder: string[],   // order to replay `improvements` onto the canonical md
  humanQuestion?: string }`
- **It never writes the canonical level md.** It runs a bounded **dual-oracle, accept-if-better
  improvement loop** and returns the *accepted improvements* for the **coordinator** to apply via the
  **file-writer** (DR-017). Per iteration (≤ `maxIterations`):
  1. **Score both oracles.** `npm run evaluate --silent -- <file>` → `LevelFitness` (gates
     `charactersReachable` / `itemsReachable` / `noAnachronisms`, complexity ints) **and** the
     **play-game** subagent → per-character/per-conclusion findings. Combine into one **combined
     fitness** (failing gates dominate; then a soft score — complexity in the target band + play-game
     difficulty balance + breadth + story coherence).
  2. **Diagnose → route** each failing gate / weak signal to the agent that owns that area (table below)
     and request a **targeted delta** (a pure subagent return).
  3. **Test on a scratch candidate.** The **file-writer** applies the delta to `_gen.<slug>.try.md`
     (NOT the canonical file); re-run **both** oracles on it.
  4. **Accept-if-better.** Keep the delta **only if** the combined fitness strictly improves **and no
     gate regresses**; else discard and try a different fix/agent. Accepted deltas accumulate in the
     **ledger** and carry forward as the new working base.
  5. **Iterate**, each round attacking the highest-value failing gate, then the weakest soft signal —
     iteratively building the best story / layout / timeline / items it can. Stop when gates pass and the
     soft score plateaus (no improving move for a few tries) or the cap hits.
- **Routing — which agent owns which fault/opportunity:**

  | Signal (solver / play-game) | Route to | Targeted directive |
  |---|---|---|
  | `loaded:false` (line named); *"missing conclusion answer phrases"* | **game-conclusions** (or the named section's agent) | fix the named line / make every cloze answer a category member |
  | `charactersReachable:false`, `unreachable.characterIds` | **game-cron** (± game-architect adjacency, game-scout start room) | bring the stranded character into a shared scene |
  | `itemsReachable:false`, `unreachable.itemIds` | **game-cron** (± game-itemiser placement) | route a reachable character to witness the item |
  | `noAnachronisms:false`, `anachronisms[]` | **game-cron** | fix the itinerary timestamps (an absolute arrival back-planned over earlier speech) |
  | play-game Identities `none` | **game-scout** (± game-cron) | add a witnessable tell for that identity |
  | play-game `too-easy` | **game-scout** / **game-conclusions** / **game-cron** | add distractors / soften direct tells / harder cloze / more indirection |
  | play-game `too-hard` / `unsolvable` | **game-scout** / **game-cron** | add a supporting clue or a clue-revealing scene |
  | play-game conflict / ambiguous | **game-scout** / **game-conclusions** | disambiguate the clashing identities/answers |
  | complexity below band (`meanCost` low) | **game-cron** (± architect / itemiser) | deepen transfer chains (more indirection) |
  | complexity above band | **game-cron** / **game-architect** | shorten the chains |
  | story thin / incoherent (downstream signals) | **story-teller** (last resort — expensive) | re-deepen the story thread |
- **Escalates** by setting `humanQuestion` (and `status:"needs-human"`) when it cannot decide —
  conflicting objectives, repeated failure to move a gate, or an ambiguous `direction`. The main
  coordinator asks the user and may re-invoke with the answer as `direction`.
- **After it returns:** the **coordinator** applies the accepted `improvements` (in
  `recommendedApplyOrder`) to the **canonical** `_gen.<slug>.md` via the **file-writer** (one call per
  improvement, each written so the user can live-test via `npm run dev-gen`). If `humanQuestion` is set
  (or the return is otherwise ambiguous), the coordinator asks the user **before** applying.
