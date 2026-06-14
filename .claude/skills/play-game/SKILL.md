---
name: play-game
description: >-
  Play a Castle Mystery level as a player would and report whether each CONCLUSION is solvable from
  witnessable evidence — without being told the answers. Covers the Identities conclusion (work out
  which name each character is) and fill-in-the-blanks (cloze) conclusions (for each blank, explain
  how the player can infer the correct value is true). Produces per-level, per-conclusion authoring
  feedback: the clue/inference chain for every character and every blank, plus too-easy / too-hard /
  unsolvable-gap call-outs. Use when asked to "play" a level, check conclusion/identity solvability
  or clues, or get design feedback. ANALYSIS ONLY — never edits level files.
---

# play-game — conclusion solvability analysis

You are simulating a **player** of a Castle Mystery level. During play a character is just an unnamed
figure (the player sees their sprite, not their name) doing and saying things; the player does **not**
know who anyone is or what "really happened" until they solve the level's **conclusions**.

Your job, per conclusion: decide whether a player *could* deduce the answer(s) from what they
witness, and report the clue/inference chain as **authoring feedback** (not just pass/fail) — so the
author can steer storytelling and tune difficulty.

This skill is **read-only**. Never edit `public/levels/*` or any level content.

## Input

`/play-game [levelFilename]`

- With a filename (e.g. `01_birth_of_constantine.md`): analyse just that level.
- With no argument: read `public/levels/levels.md` and analyse every level it lists (currently
  `00_prologue.md`, `01_birth_of_constantine.md`, `02_house_of_rocks.md`). Every level has an
  Identities conclusion, so a level is never skipped on that basis.

## How a level encodes conclusions (background)

- A level file in `public/levels/` pulls in shared `characters.md` and `items.md` via its `# General`
  `* imports=` line. Read the level **and** its imports.
- The **real** `# Conclusions` section is a top-level `#` heading literally named "Conclusions".
  Only that section counts. A bare `Conclusions:` line sitting inside another section (e.g. authoring
  notes in `# General`) is **prose, not a conclusions section** — ignore it.
- Inside `# Conclusions`: optional **category-definition** lines come first (`* verbs=stole|hid|…`,
  `* withObjects=a hammer|other vases|…`), then `## <name>` subsections — **each subsection is one
  conclusion**. Two shapes matter:
  - **Identities** — **always present for every level, whether or not a `## Identities` subsection (or
    even a `# Conclusions` section) exists.** It is the implicit, auto-generated puzzle the player is
    always expected to solve: work out which name each **interactive** character is. Interactive =
    non-empty `* description=`; `* title=` (or the `## heading`) is the answer; `* faceImage=` is the
    sprite the player sees; the candidate pool = the titles of *all* interactive characters. (Generic
    extras with no description are excluded.) A `## Identities` subsection, when present, only carries
    config (e.g. `unlockConclusions=`); its absence never removes the puzzle.
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
- **Never skip a level for a missing `# Conclusions` section or missing `## Identities` subsection.**
  The Identities conclusion is always expected of the player and is always analysed. A missing or
  empty `# Conclusions` section just means there are **no cloze conclusions** to analyse on top of
  Identities.

## Method (per analysed level)

1. **Load** the level + imported `items.md`/`characters.md`. **Always analyse the Identities
   conclusion** — it is implicit, always expected of the player, and never skipped. Then locate the
   real `# Conclusions` section: if one exists, also enumerate its cloze subsections (step 2); if
   there is none (or only a stray `Conclusions:` in prose — note that explicitly), Identities is
   simply the only conclusion to report. The one "nothing to identify" case is a level with **zero
   interactive characters** — say so explicitly rather than skipping.
2. **Enumerate** the conclusions: always the implicit **Identities**, plus — when a real
   `# Conclusions` section exists — each `## <name>` subsection in it (reading the
   category-definition lines first).
3. **Take the player's view.** Treat each character's authored name/title, `## heading`, and
   itinerary **speaker attribution** as the HIDDEN answer — reason about each character only from what
   a player can witness: its **description**, the **words it speaks** (verbatim), what it **does**
   (move / take / drop / give / die), **items** it carries or co-located items (+ their
   titles/descriptions), and **names or epithets spoken aloud / written on objects** ("LARRY!",
   "Queen of Sicily", `"Amos"` on a vase). Use those in-world mentions as clues; just don't assume
   the authored attribution. (You may refer to characters by name in the report for readability —
   the discipline is to *derive* the identity, not to assume it.)
4. **Analyse each conclusion** (reason only from witnessable evidence, not the answer key):
   - **Identities** — for every interactive character: state the name and give the clue chain (quote +
     tag each `object` / `conversation` / `description` / `behaviour`), classified **direct** (one
     clue), **combined** (≥2), or **none** (no clue). Flag characters resting only on **POV**
     (`* activeCharacter=`) or **elimination** — they have no positive clue. Flag any two interactive
     characters that share the same `* faceImage=` sprite (the player can't tell them apart).
   - **Cloze** — print the sentence with its blanks, then for **each blank**: the correct value, its
     **pool** (category + the notable distractors), and **how the player infers it is true** — quote
     the witnessable evidence and tag it (`timeline` / `conversation` / `object` / `behaviour`),
     classified direct / combined / none. Say when a blank **depends on another conclusion** (a
     `characters` blank needs Identities solved first; an `items` blank needs the object examined).
5. **Grade** against the authored answers. Be honest: the verdict is whether the evidence **suffices**
   for a disciplined player, not whether you knew the answer. Use `❌` if the evidence points a
   careful player to the *wrong* value (a misleading-clue bug).
6. **Report** (below). Read-only — modify nothing.

## Output format

One block per level. Lead with the level and the list of its conclusions, then a section per
conclusion (a `── Conclusion: <name> ──` heading), then a per-conclusion summary. Refer to characters
by **name** (not the sprite filename). Keep it scannable.

```
═══ Level: <file> ═══
Conclusions: <Identities, What Happened to the Vase?, …>

── Conclusion: Identities ──   (<N> interactive characters; pool = their <N> titles)
✅ <Character Name>              [direct|combined — <note>]
   • <tag>: <quoted clue>
⚠️  <Character Name>             [none — UNSOLVABLE GAP / POV / elimination]
Summary (Identities): <X>/<N> identifiable.  Gaps: …  Too easy: …  Too hard: …

── Conclusion: <Cloze name> ──
"<the cloze sentence, with [blanks] shown>"
✅ [Larry]       (pool: characters)  → Larry        [direct — depends on Identities]
   • timeline: "Larry takes Vase in right hand" then bolts off — the player sees this character grab it
✅ [Gift Shop]   (pool: rooms)       → Gift Shop     [direct]
   • timeline: the thief runs to the Gift Shop and "drops Vase"; the guide chases ("Where is it?")
⚠️  [other vases](pool: withObjects) → other vases   [combined — mostly by elimination]
   • behaviour: dropped among the gift-shop shelves; rival options (a hammer, his uncle…) are absurd
Summary (<name>): <all blanks inferable | blanks needing work: …>; too easy: …; too hard: …
```

`✅` = the evidence suffices (and is correct); `⚠️` = an unsolvable gap (or POV/elimination only);
`❌` = the evidence points a careful player to the wrong answer.

## Scope & limitations (state when relevant)

- Covers the **Identities** conclusion — **always present and analysed for every level, even with no
  `# Conclusions` section** — and **fill-in-the-blanks (cloze)** conclusions. Subsections that are
  neither (e.g. unlock-only) are listed but not analysed.
- **No witnessability gating yet**: a clue counts even if the player might not reach the scene where
  it occurs. (Reachability gating via the logical solver is a future enhancement.)
- Identity is something to *derive* from evidence, not assume — reason from what's witnessable, not
  the answer key.
- Independent of the deterministic logical solver (`npm run solve`); does not call it.
