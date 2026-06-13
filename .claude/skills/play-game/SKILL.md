---
name: play-game
description: >-
  Play a Castle Mystery level as a player would and report whether each character's IDENTITY is
  inferable from witnessable clues (their description, conversations, object/item text, and
  behaviour) — without being told who is who. Produces per-level, per-conclusion authoring feedback:
  each character mapped to the clues that reveal them, plus too-easy / too-hard / unsolvable-gap
  call-outs. Use when asked to "play" a level, check identity solvability or clues, or get design
  feedback on a level's Identities conclusion. ANALYSIS ONLY — never edits level files.
---

# play-game — identity inferability analysis

You are simulating a **player** of a Castle Mystery level. A player sees each character only as an
anonymous **face** (the `faceImage`) and a set of behaviours; they do **not** know who anyone is
until they solve the **Identities** conclusion by matching every face to a name from a known pool.

Your job: decide whether a player *could* deduce each character's identity from what they can
witness, and report the clue chain for every character as **authoring feedback** — not just
pass/fail. This helps the author steer storytelling and tune difficulty.

This skill is **read-only**. Never edit `public/levels/*` or any level content.

## Input

`/play-game [levelFilename]`

- With a filename (e.g. `01_birth_of_constantine.md`): analyse just that level.
- With no argument: read `public/levels/levels.md` and analyse every level it lists that has an
  Identities conclusion (currently `00_prologue.md`, `01_birth_of_constantine.md`,
  `02_house_of_rocks.md`).

## How a level encodes identities (background)

- A level file lives in `public/levels/` and pulls in shared `characters.md` and `items.md` via its
  `# General` `* imports=` line. Read the level **and** its imports.
- The `# Conclusions` section has `## <name>` subsections. One is **Identities** (auto-generated from
  the cast). Each subsection name is a conclusion present in the level.
- **Interactive characters** are those with a non-empty `* description=` (in `characters.md` or the
  level's `# characters`). Only interactive characters appear in the Identities puzzle; generic
  extras with no description (e.g. "Male Peasant 3") are excluded — ignore them.
- For each interactive character: their `* title=` (or, if absent, the `## heading`) is the **answer**;
  their `* faceImage=` is the **anonymous handle** the player sees. The **candidate name pool** the
  player chooses from = the titles of *all* interactive characters.
- If a level has **no Identities conclusion**, skip it: report "no identity puzzle — skipped".

## Method (do this for each analysed level)

1. **Load.** Read the level file + its imported `items.md` / `characters.md`. Enumerate every
   conclusion (`## <name>` under `# Conclusions`, including Identities). If no Identities conclusion,
   skip the level.
2. **Roster.** List the interactive characters with their face handle, title (answer), and the shared
   candidate name pool. Flag any two interactive characters sharing a `faceImage` — the player can't
   tell those faces apart, which is itself a finding.
3. **Adopt the player's view (anonymise).** Treat each character's authored title, `## heading`, and
   itinerary **speaker attribution** as the HIDDEN answer — the player does not see these. The player
   *does* witness, per face:
   - the character's own **description** (what they look like / wear / badges they carry),
   - the **words each face speaks** (quoted speech, verbatim),
   - what each face **does** (moves between rooms, takes/drops/gives items, dies, etc.),
   - **items** the face carries or that sit in its room, and those items' **titles/descriptions**,
   - and crucially, **names or epithets spoken aloud** ("LARRY!", "Queen of Sicily", "Amos") and
     names **written on objects** — these are in-world clues the player hears/reads. Keep them; only
     the *attribution* of who-is-who is hidden.
4. **Infer.** Reasoning **only from the witnessable evidence** (not the answer key), deduce which
   candidate name each face is. For every clue you use, quote it and tag it:
   - `object` — text on/in an item (plaque, label, letter, monogram).
   - `conversation` — something said aloud that names or addresses the face, or that the face says
     about itself.
   - `description` — the face's own visible description (uniform, badge, age, role).
   - `behaviour` — what the face does / their role over the timeline.
   Classify each identity:
   - **direct** — a single clue pins it unambiguously.
   - **combined** — needs ≥2 clues together (e.g. role + who-addresses-them).
   - **none** — no witnessable clue distinguishes this face → the player cannot deduce it.

   Two weak aids to consider, and to **flag** when a face relies on them:
   - **POV** — the level's `* activeCharacter=` is the face the player inhabits; its identity may be
     self-known even with no third-party clue.
   - **elimination** — once every other face is pinned, the last one is forced. Treat as `combined`,
     but call it out: a face identifiable *only* by elimination or POV has **no positive clue**,
     which is useful design feedback (the author may want to plant one).
5. **Grade.** Now compare against the authored titles and mark each face ✓/✗. The real verdict is
   whether the clues **suffice** for a disciplined player — be honest if you only "knew" the answer
   from the attribution rather than from a real clue.
6. **Report** (below). Read-only — do not modify any file.

## Output format

Print one block per level. Lead with the level, list **all** its conclusions (Identities analysed
now; others marked "not yet analysed"), then the Identities analysis for **every** character, then a
summary with authoring feedback. Keep it scannable.

```
═══ Level: <file> ═══
Conclusions in this level: <Identities, …>
  • <Other Conclusion> — not yet analysed

── Conclusion: Identities ──   (<N> interactive characters; pool = their <N> titles)

✅ <faceImage> → <inferred name>            [direct|combined — <difficulty note>]
   • <tag>: <quoted clue>
   • <tag>: <quoted clue>
⚠️  <faceImage> → <best guess or "?">        [none — UNSOLVABLE GAP]
   • no object/conversation/description/behaviour clue identifies this face

Summary (Identities): <X>/<N> identifiable.
  • Gaps (fix before ship): <names with no clue, or "none">
  • Maybe too easy: <names pinned by a single give-away, or "none">
  • Maybe too hard: <names needing long/subtle combined chains, or "none">
```

Use `✅` when the clues suffice and the inferred name is correct, `⚠️` for an unsolvable gap, and
`❌` if the clues point a disciplined player to the *wrong* name (a misleading-clue problem — worth
flagging). Mention shared-face collisions in the summary.

## Scope & limitations (state these if relevant)

- **Identities only** for now. Other conclusions (e.g. Occupations) are listed but not yet analysed.
- **No witnessability gating yet**: a clue counts even if a player might not reach the room/scene
  where it occurs. (Reachability gating via the logical solver is a future enhancement.)
- Anonymisation is by discipline, not a tool — reason from the evidence, not the answer key.
- This complements, and is independent of, the deterministic logical solver (`npm run solve`); it
  does not call it.
