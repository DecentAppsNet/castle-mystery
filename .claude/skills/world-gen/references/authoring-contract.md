# Level authoring contract

The precise format a generated level must follow to (a) **load** without a `LoadLevelException`
and (b) **pass the solver** (`npm run evaluate`). This is the contract every world-gen specialist
agent is held to. The source of truth is the loader code under `src/levelLoading/`; this is the
practical digest. `public/levels/00_prologue.md` is the canonical minimal working example — mirror
its structure.

A level is one Markdown file. Sections are `#` headings **in this order**:
`General`, `Map`, `Rooms`, `Characters`, `Items`, `Itinerary`, `Conclusions`. **`General` and `Map`
are required** — the loader fails with "missing required map section" if a `# Map` section is absent
(or empty), so every generated level MUST include one.

---

## ID normalization (read first — the #1 cause of load/solve failures)

Every name you write becomes a normalized **id** via `normalizeId()`, which is **only
`trim().toLowerCase()`** — it does *not* strip spaces or punctuation. `Farmer's Wife` →
`farmer's wife`. Multi-word and punctuated names are fine; what matters is that you **spell each name
identically everywhere** (a room grid `* W=Farmer's Wife`, the itinerary `Farmer's Wife @ Kitchen`,
and the conclusion `[Farmer's Wife]` must be the same text, case-insensitively). Mismatched spelling
is the #1 cause of "unknown character/item/room" load failures. Single-character map/grid legend
letters are matched case-sensitively (`c` ≠ `C`).

Rule of thumb: pick a canonical display title per character/item/room and reuse it verbatim.

---

## 1. `# General`

`* name=value` bullets.

```
# General

* title=Three Blind Mice
* activeCharacter=Curio
* time=18:00:00
* background=daySky.png
* winSynopsis=One sentence shown on completion.
```

- `title` — **required**.
- `activeCharacter` — id of the character the player starts as. Must match a placed character.
  Solver reachability is measured **from this character**, so choose one that meets everyone.
- `time` (or `startTime`) — `HH:MM:SS` or `HH:MM`. The itinerary's first absolute timestamp.
- `background` — a `*.png` filename. (Images are never loaded during scoring; any filename is fine.)
- `imports=items.md | characters.md` — **optional**. Only import the shared medieval cast/items if
  you actually use them. A self-contained narrative (e.g. Three Blind Mice) defines its own and
  omits `imports`.

## 2. `# Map`

One fenced code block: a grid of legend letters and `.` (empty). Then a `* LETTER=Room Title`
legend line per non-`.` letter. **Each room is a single rectangular block of one letter.** Adjacent
rooms (sharing a grid edge) can have a connecting exit.

```
# Map

```
.......
VVV....
VVVHHGG
```

* V=Exhibit Room
* H=Hallway
* G=Gift Shop
```

Here `V` is a 2×3 rectangle, `H` and `G` are 1×2. `V`|`H` touch and `H`|`G` touch, so those exits
are possible.

**Exits are always horizontal.** Two rooms connect through a shared **vertical wall** — they are
horizontally adjacent (east–west). There are **no vertical (ceiling/floor) exits**, so two rooms that
share only a *horizontal* edge (one directly above the other) do not connect there ("ceiling or floor
exits are not supported").

**A single room may have several exits on the same side** (more than one on its east wall and/or its
west wall). This is how **multi-storey** layouts work: a tall room — e.g. a staircase or hall spanning
several rows — can hold one east exit to an upper-floor room and another east exit to a lower-floor
room. For example, staircase `S` (rows 0–3) with an upper room `U` (rows 0–1) and a lower room `L`
(rows 2–3) on its east side:

```
SU
SU
SL
SL
```

`S` has two east exits (to `U` and to `L`); `U` and `L` reach each other only via `S`. A plain
single-row chain like `PPKKYYBB` just connects Pantry–Kitchen–Yard–Barn.

## 3. `# Rooms`

A `## Room Title` subsection per room (title must match the map legend). Each has an **optional
3-row grid** (the three depth layers: back / middle / front) placing characters and items, plus
`* exits=` and any room flags.

```
## Exhibit Room

```
.....s...v..
..M....L....
............
```

* s=Sarcophagus | Sarcophagus Lid
* exits=hallway
* v=Pedestal | Vase
* L=Lorenzo
* M=Marty
```

- **Grid size is fixed:** exactly **3 rows** by **(room's map-tile width × 4) columns**. A room 2
  tiles wide needs an 8-column grid; 3 tiles wide needs 12 (the prologue's Exhibit Room grid is 12
  wide). The 3 rows are the back / middle / front depth layers.
- Grid legend `* c=Entity` places a character or item at that cell. Stack multiple in one cell with
  `|` (`* s=Sarcophagus | Sarcophagus Lid`). Legend letters are **per-room** (the same `L` can be a
  different character in another room).
- `* exits=Room Title | Room Title (modifier)` — pipe-separated. Declare each exit **once** (on one
  of the two rooms); the engine connects both sides via map adjacency. The target must be an
  **adjacent** room on the map.
- Exit modifiers (optional): `open` / `closed` / `locked` / `unlocked` / `lockable` / `unlockable`,
  or `lockable with <Item Title>`. No modifier = an always-open doorway. **Closed/locked doors block
  audibility and can block the player** — for a first solvable level, prefer plain open doorways.
- Optional room flags: `* outside=true`, `* obscured=true`.

## 4. `# Characters`

`## Name` → character id. The heading (or `* title=`) is the **hidden identity** the player must
deduce (characters are `isTitleKnown=false` by default).

```
## Lorenzo

* description=He wears a name badge that says "Guida / Guide - Lorenzo".
* faceImage=lorenzo.png
* facing=left
```

- **Must be placed.** A character only exists at runtime if it is placed in some room's grid via a
  legend letter. Declaring it in `# Characters` — or only naming it in the itinerary — is **not
  enough**; an unplaced character causes an "unknown character" failure. Place every character you use.
- `description` — a character is **interactive** (and gets an Identities blank) when it has a
  non-empty description (or a faceImage, or is placed). Always give real characters a description.
- `faceImage=<name>.png` — the sprite, resolved to `/assets/faces/<name>.png`. **Use a real file from
  `public/assets/faces/`, and give every character a *different* one** (~37 are available — plenty even
  for large casts) so the generated level actually renders for playtesting (`npm run dev-gen`). The
  image isn't loaded during scoring, but a real, unique face keeps the level usable.
- Optional: `* title=` (full name if different from heading), `* facing=left|right`,
  `* orientation=standing|sitting|laying`, `* items=A | B` (carried), `* alive=false`,
  `* isTitleKnown=true` (reveal from the start — usually leave false).

## 5. `# Items`

`## Name` → item id.

```
## Vase

* description=An ancient clay vase with faded symbols on it.
* image=amosVase.png
```

- Optional: `* description=`, `* image=<name>.png`, `* drawOffsetX/Y/Z=` (numeric render nudges).
- An item only becomes a solver node when **placed** — in a room grid or carried via a character's
  `* items=`. Defined-but-unplaced items are ignored.

## 6. `# Itinerary`

The timeline. Lines are either an **absolute** `HH:MM:SS` (or `HH:MM`) timestamp, or `:` meaning
"after the previous line completes". A line names a character then an activity; a `:` line with no
name continues the **most recently named** character.

```
# Itinerary

18:00:00 Marty says, "Aren't you going to give a tour?"
: Lorenzo says, "I need more people here before I can start."
18:00:16 Larry @ Exhibit Room.90%
: Lorenzo faces right.
: says, "Okay, two is enough for a tour."
: Larry takes Vase in right hand
18:00:45 Larry @ Gift Shop.80%
: drops Vase (.5,-.8,0)
```

Activities:
- `Name @ Room Title` or `Name @ Room Title.NN%` — move to a room (optional 0–100% position).
- `says, "…"` (audible) / `interrupts "…"` (intentional overlap) / `thinks, "…"` (silent).
- `faces left|right`, `stands|sits|lays`.
- `takes <Item> in left|right hand`, `drops <Item> (x,y,z)`, `gives <Item> to <Character>`.
- `dies`. `(free narrator note)`.

Rules: a single character may not have two **overlapping** `says` (load fails) — sequence speech
with `:` or use `interrupts`. Items must exist before being taken/dropped.

## 7. `# Conclusions`

Optional category option-lists first, then `## <name>` subsections. Each subsection is one
conclusion.

```
# Conclusions

* verbs=stole|hid|broke|cut|chased
* withObjects=a carving knife|her apron|the cheese

## Identities

* unlockConclusions=What Happened to the Tails?

## What Happened to the Tails?

* conclusion=[The Farmer's Wife] [cut] off the mice's tails with [a carving knife].
```

- **Always include an explicit `## Identities`** subsection (even if it only carries config like
  `* unlockConclusions=`). The loader fills it with **one fill-the-name blank per interactive
  character** (answers = the characters' titles). This is the core puzzle; making it explicit lets the
  conclusions agent focus on the *other* conclusions.
- **Cloze** — `* conclusion=` (alias `* clozeStatement=`) text with `[blank]`s. The text inside
  `[...]` is the **correct answer** (`a|b` = either accepted).
- **Every cloze answer MUST be a member of a conclusion category** (matched case-insensitively), or
  the level fails to load: *"missing conclusion answer phrases from conclusion categories: X"*. The
  categories are:
  - **implicit `characters`** = the interactive characters' **`* title=`** values (NOT the `##`
    heading/id) — so a character blank must use the title: `[The Farmer's Wife]`, not `[Dame Hartwell]`.
  - **implicit `rooms`** = room titles; **implicit `items`** = interactive item titles.
  - **author-defined** = each `* name=opt1|opt2|…` line at the top of `# Conclusions` (e.g. `verbs`,
    `withObjects`). Every answer that isn't a character/room/item title must be listed in one of these.
  The other options in a blank's category become the **distractors** the player must rule out.
- Optional per subsection: `* title=`, `* unlockConclusions=A | B`, `* revealRooms=Room | Room`.

---

## Making it SOLVE (so `npm run evaluate` reports `gates.ok: true`)

The solver checks two things from the `activeCharacter`:

1. **Character reachability** — every character must be reachable by a chain of *co-presence*: two
   characters are linked if they share a room at the same sampled time (level start, or any
   room-entry / item-move tick). So the **itinerary must engineer scenes** that transitively connect
   everyone to the active character. Simplest recipe: start several characters together, and have
   others move into a shared room over time so the whole cast is linked.
2. **Item reachability** — every *placed* item must share a room with a *reachable* character at
   some sampled time. Put items in rooms that reachable characters occupy or visit.

If a character never shares a room with the connected group, they show up in
`unreachable.characterIds`; an item no reachable character ever stands with shows up in
`unreachable.itemIds`. Both make `gates.ok` false.

**Complexity** (`complexity.maxCost` / `meanCost`) measures how many character-switches the player
needs to reach each item. Authored levels sit around mean 0.5–1.0, max ~2. Don't chase complexity in
Phase 1 — just get a connected, item-reachable level that loads and passes.
