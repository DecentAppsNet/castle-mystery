---
name: play-game
description: >-
  Play a Castle Mystery level as a player would and report whether each CONCLUSION is solvable from
  witnessable evidence — without being told the answers. Covers the Identities conclusion (match each
  anonymous face to a name) and fill-in-the-blanks (cloze) conclusions (for each blank, explain how
  the player can infer the correct value is true). Produces per-level, per-conclusion authoring
  feedback: the clue/inference chain for every character and every blank, plus too-easy / too-hard /
  unsolvable-gap call-outs. Use when asked to "play" a level, check conclusion/identity solvability
  or clues, or get design feedback. ANALYSIS ONLY — never edits level files.
---

# play-game — conclusion solvability analysis

You are simulating a **player** of a Castle Mystery level. A player sees each character only as an
anonymous **face** (the `faceImage`) and witnesses behaviour, speech, and objects; they do **not**
know who anyone is or what "really happened" until they solve the level's **conclusions**.

Your job, per conclusion: decide whether a player *could* deduce the answer(s) from what they
witness, and report the clue/inference chain as **authoring feedback** (not just pass/fail) — so the
author can steer storytelling and tune difficulty.

This skill is **read-only**. Never edit `public/levels/*` or any level content.

## Input

`/play-game [levelFilename]`

- With a filename (e.g. `01_birth_of_constantine.md`): analyse just that level.
- With no argument: read `public/levels/levels.md` and analyse every level it lists that has an
  Identities conclusion (currently `00_prologue.md`, `01_birth_of_constantine.md`,
  `02_house_of_rocks.md`).

## How a level encodes conclusions (background)

- A level file in `public/levels/` pulls in shared `characters.md` and `items.md` via its `# General`
  `* imports=` line. Read the level **and** its imports.
- The **real** `# Conclusions` section is a top-level `#` heading literally named "Conclusions".
  Only that section counts. A bare `Conclusions:` line sitting inside another section (e.g. authoring
  notes in `# General`) is **prose, not a conclusions section** — ignore it.
- Inside `# Conclusions`: optional **category-definition** lines come first (`* verbs=stole|hid|…`,
  `* withObjects=a hammer|other vases|…`), then `## <name>` subsections — **each subsection is one
  conclusion**. Two shapes matter:
  - **Identities** — the `## Identities` subsection. Its cloze is auto-generated: match each
    **interactive** face to a name. Interactive = non-empty `* description=`; `* faceImage=` is the
    anonymous handle; `* title=` (or the `## heading`) is the answer; the candidate pool = the titles
    of *all* interactive characters. (Generic extras with no description are excluded.)
  - **Fill-in-the-blanks (cloze)** — a subsection with `* conclusion=` (or `* clozeStatement=`) whose
    text contains `[blank]`s, e.g. `[Larry] took the vase to the [Gift Shop] and [hid] it with
    [other vases].` Each `[value]` is a blank the player fills; the text inside `[...]` is the
    **correct answer** (`a|b` means either is accepted).
  - Any other subsection (only `unlockConclusions` / `revealRooms`, no cloze) — list it, nothing to
    infer.
- **Blank option pools.** Each blank's value comes from a category: author-defined ones above, plus
  implicit defaults — `characters` (interactive titles), `rooms` (room titles), `items` (interactive
  item titles). The blank's pool = the category whose list contains the correct value; the *other*
  entries are the **distractors** the player must rule out.
- If a level has **no real `# Conclusions` section containing `## Identities`**, skip it.

## Method (per analysed level)

1. **Load** the level + imported `items.md`/`characters.md`. Locate the real `# Conclusions` section.
   If there is none, or no `## Identities` in it, **skip** ("no identity puzzle — skipped"; if a
   stray `Conclusions:` appears as prose elsewhere, say so explicitly).
2. **Enumerate** the `## <name>` subsections (= the conclusions) and read the category-definition
   lines.
3. **Adopt the player's view (anonymise).** Treat each character's authored title, `## heading`, and
   itinerary **speaker attribution** as the HIDDEN answer. The player witnesses, per face: its
   **description**, the **words it speaks** (verbatim), what it **does** (move / take / drop / give /
   die), **items** it carries or co-located items (+ their titles/descriptions), and **names or
   epithets spoken aloud / written on objects** ("LARRY!", "Queen of Sicily", `"Amos"` on a vase) —
   keep those; only who-is-who is hidden.
4. **Analyse each conclusion** (reason only from witnessable evidence, not the answer key):
   - **Identities** — for every interactive face: `face → inferred name`, the clue chain (quote +
     tag each `object` / `conversation` / `description` / `behaviour`), classified **direct** (one
     clue), **combined** (≥2), or **none** (no clue). Flag faces resting only on **POV**
     (`* activeCharacter=`) or **elimination** — they have no positive clue.
   - **Cloze** — print the sentence with its blanks, then for **each blank**: the correct value, its
     **pool** (category + the notable distractors), and **how the player infers it is true** — quote
     the witnessable evidence and tag it (`timeline` / `conversation` / `object` / `behaviour`),
     classified direct / combined / none. Say when a blank **depends on another conclusion** (a
     `characters` blank needs Identities solved first; an `items` blank needs the object examined).
5. **Grade** against the authored answers and mark ✓/✗. Be honest: the verdict is whether the
   evidence **suffices** for a disciplined player, not whether you knew the answer. Use `❌` if the
   evidence points a careful player to the *wrong* value (a misleading-clue bug).
6. **Report** (below). Read-only — modify nothing.

## Output format

One block per level. Lead with the level and the list of its conclusions, then a section per
conclusion (a `── Conclusion: <name> ──` heading), then a per-conclusion summary. Keep it scannable.

```
═══ Level: <file> ═══
Conclusions: <Identities, What Happened to the Vase?, …>

── Conclusion: Identities ──   (<N> interactive characters; pool = their <N> titles)
✅ <faceImage> → <name>          [direct|combined — <note>]
   • <tag>: <quoted clue>
⚠️  <faceImage> → <? >            [none — UNSOLVABLE GAP / POV / elimination]
Summary (Identities): <X>/<N> identifiable.  Gaps: …  Too easy: …  Too hard: …

── Conclusion: <Cloze name> ──
"<the cloze sentence, with [blanks] shown>"
✅ [Larry]       (pool: characters)  → Larry        [direct — depends on Identities]
   • timeline: "Larry takes Vase in right hand" then bolts off — the player sees this face grab it
✅ [Gift Shop]   (pool: rooms)       → Gift Shop     [direct]
   • timeline: the thief runs to the Gift Shop and "drops Vase"; the guide chases ("Where is it?")
⚠️  [other vases](pool: withObjects) → other vases   [combined — mostly by elimination]
   • behaviour: dropped among the gift-shop shelves; rival options (a hammer, his uncle…) are absurd
Summary (<name>): <all blanks inferable | blanks needing work: …>; too easy: …; too hard: …
```

## Scope & limitations (state when relevant)

- Covers the **Identities** conclusion and **fill-in-the-blanks (cloze)** conclusions. Subsections
  that are neither (e.g. unlock-only) are listed but not analysed.
- **No witnessability gating yet**: a clue counts even if the player might not reach the scene where
  it occurs. (Reachability gating via the logical solver is a future enhancement.)
- Anonymisation is by discipline, not a tool — reason from the evidence, not the answer key.
- Independent of the deterministic logical solver (`npm run solve`); does not call it.
