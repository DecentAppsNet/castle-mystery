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
- `prompt` → synthesiser: *create the level file and write `# General` `title`/`winSynopsis` from the
  story.* The rest of `story` is **context** the coordinator passes to wave-2/3 agents — it is **not**
  written into the md.

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

## synthesiser  (SOLE WRITER — DR-012)
- **IN** `{ currentLevelMd: string | null,   // null on the first call → creates the file
  subagentIdentifier: "story-teller" | "game-architect" | "game-scout" | "game-itemiser" |
                      "game-cron" | "game-conclusions",
  subagentReturn: <that agent's OUT, including its prompt> }`
- **OUT** `{ levelMd: string }`  **and writes** `public/levels/_gen.<slug>.md`.
- Applies exactly one subagent's return per call, following its `prompt`, **resolving cross-references**
  against the current md (owner→character id, activeCharacter→id, cloze answer→title). Writes the file
  every call so each transitional state is testable via `npm run dev-gen`.

## validator-coordinator  (sub-hub — DR-014)
- **IN** `{ levelFilename: string, story: Story, maxIterations: number }`
- **OUT** `{ status: "pass" | "needs-human" | "exhausted", fitness, playGameFindings,
  humanQuestion?: string }`
- Runs the solver (`npm run evaluate`) and the play-game semantic check; within `maxIterations`, calls
  the relevant **wave subagents** for targeted fixes and routes their returns through the
  **synthesiser** (which writes each transition). Surfaces `humanQuestion` up to the main coordinator
  when it needs user input; never writes files itself.
