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
  - **One-mover caveat (2026-06-15):** if the active character is the *only* one who moves (NPCs run
    dialogue-only itineraries), the solver's co-presence ticks are all the active character's own
    `ROOM_ENTRY` times, and at each the mover resolves to the room being **left**. So an absolute
    `Active @ NpcRoom` arrival does **not** by itself put the active character in that room — a
    stationary NPC alone in a room is caught only by **level-start** co-presence or the **timeline-end**
    sample. Either start the NPC co-present with the cast, or have the active character **END the tour in
    that NPC's room** (so `findTimelineEndTime` samples them together). The *last* room of a one-mover
    tour is the one that needs this; earlier stops are caught as "the room being left" at the next
    absolute arrival.
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

## world-test  (semantic oracle subagent — read-only · wraps the `/world-test` skill)
- **IN** `{ levelFilename: string }`  (reads the candidate + its imports; **never writes**)
- **OUT** `{
  perCharacter: [{ name, identityInferable: "direct" | "combined" | "none", note }],   // Identities
  perConclusion: [{ name, blanks: [{ value, pool, inferable: "direct"|"combined"|"none", note }],
                   difficulty: "too-easy" | "just-right" | "too-hard" | "unsolvable" }],
  conflicts: [{ description }],          // ambiguous / contradictory solutions a careful player hits
  summary: string }`
- The **semantic oracle**: it returns the `/world-test` analysis as **structured data** (not prose) so
  **world-fix** can turn it into fix recommendations. Read-only, like the skill itself.

## world-fix  (the DECIDER — its own skill, read-only — DR-019)
- **IN** `{ levelFile: string }`   // mandatory; the candidate to analyse
- **OUT** `{ verdict: "READY" | "NEEDS-WORK",
  ready: boolean,          // true ⇔ loads + all gates pass + no BLOCKER/MAJOR item
  items: [{ severity: "blocker" | "major" | "minor", area: "game-cron" | "game-scout" |
            "game-itemiser" | "game-architect" | "game-conclusions" | "story-teller",
            issue: string, fix: string, evidence: string }],   // the prioritised TODO
  solver,                  // the raw LevelFitness JSON
  worldTest }`              // the structured world-test OUT
- **It NEVER writes any file** — it runs the **solver** (`npm run evaluate` / `solve`) and the
  **world-test** subagent (its own vertical sub-delegation), then synthesises the prioritised TODO and a
  verdict. It does **not** call the wave agents and does **not** implement anything (that is world-gen's
  job). It is the validator/decider, the structural+semantic analogue of the story-critic. Defined fully
  in [`.claude/skills/world-fix/SKILL.md`](../../world-fix/SKILL.md), including the **severity → owning
  area** routing table reproduced below:

  | Signal (solver / world-test) | severity | area (owning agent) | fix |
  |---|---|---|---|
  | `loaded:false` (line named); *"missing conclusion answer phrases"* | blocker | **game-conclusions** (or named section) | fix the named line / every cloze answer a category member |
  | `charactersReachable:false`, `unreachable.characterIds` | blocker | **game-cron** (± architect/scout) | bring the stranded character into a shared scene |
  | `itemsReachable:false`, `unreachable.itemIds`, fewer placed items than defined | blocker/major | **game-cron** (± game-itemiser) | route a reachable character to witness it / fix placement or drop coordinate |
  | `noAnachronisms:false`, `anachronisms[]` | blocker | **game-cron** | fix the itinerary timestamps (absolute arrival over earlier speech) |
  | world-test Identities `none` | major | **game-scout** (± game-cron) | add a witnessable tell |
  | conclusion missing / unsolvable | major | **game-conclusions** | author the cloze(s); ensure each blank is witnessable |
  | world-test `too-easy` / conflict | minor | **game-scout** / **game-conclusions** | move a tell to items-only / add distractors / disambiguate |
  | world-test `too-hard` | minor | **game-scout** / **game-cron** | add a supporting clue |
  | complexity below/above band | minor | **game-cron** (± architect / itemiser) | deepen / shorten transfer chains |
  | story thin / incoherent (pervasive) | major | **story-teller** (last resort) | re-deepen the story thread |
- **How world-gen uses it (the gate loop).** The coordinator spawns `world-fix` on the candidate; for
  each `blocker` then `major` item it calls the **owning area's wave agent** for a delta and writes it via
  the **file-writer** to the **canonical** `_gen.<slug>.md`; then it **re-runs `world-fix`** and repeats
  until `verdict:"READY"` or `maxIterations`. `world-fix` decides; world-gen implements + writes. If a
  must-fix item is ambiguous or resists repair, the coordinator asks the user (`AskUserQuestion`) and
  continues. A standalone architect instead reads `items` and implements them by hand.
