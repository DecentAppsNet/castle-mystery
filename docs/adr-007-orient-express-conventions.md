# ADR 007: Orient Express Level — Conductor Placement, Cast IDs, and Item-Slug Scheme

## Status

Accepted (level-author convention; not engine code).

## Context

Murder on the Orient Express is being authored as a single level file in `public/levels/murder-on-the-orient-express.md`, in sequential work packages (see [docs/murder-on-the-orient-express-work-packages.md](murder-on-the-orient-express-work-packages.md)). WP2 added the 13-character cast plus their signature carried inventory and had to lock in a few conventions that every later WP (especially WP3 examinables and WP4–WP7 itinerary) will rely on:

1. **Where the conductor stands at level start.** Design §2 describes Pierre Michel's "room" as the corridor itself, with Compartment 1 acting as his locker/workspace.
2. **Character IDs vs public titles.** Several characters have rank/honorific titles ("Princess Dragomiroff", "Colonel Arbuthnot", "Mrs Caroline Hubbard") and a few share a surname ("Count" / "Countess" Andrenyi). Item IDs and inventory references derive from titles via `normalizeId`, so any later mention of a character (in itinerary or in solution cloze blanks) has to match the title chosen here.
3. **Item titles are level-wide unique.** Several object types recur across characters (passport, ticket, telegram, photograph). Without a naming convention these will collide in WP3+.

## Decision

### 1. Pierre Michel starts at `Corridor.End`

Pierre Michel is placed on the **corridor** grid, in the cell adjacent to the existing `End` position marker:

```
PE........................
```

- `P=Pierre Michel` puts the character at the very front of the corridor (column 0, ~20 units left of the `End` marker).
- `E=End` keeps the position marker that WP1 introduced.
- Compartment 1 contains **no character at t=0**. It is reserved as Pierre's locker; its examinable contents (master-key spare, hat, etc.) are populated in WP3.
- WP4's dinner itinerary will move Pierre into the Restaurant Car like any other character; WP5's `Pierre Michel @ Corridor.End` will resolve cleanly because both Pierre's starting waypoint and the End marker live at the same y-coordinate, ~20 units apart.

The alternative — placing Pierre inside Compartment 1 — was rejected because it would require an early `Pierre Michel @ Corridor.End` move in WP4 just to get the conductor to his post before dinner service starts.

### 2. Character section IDs vs `title`

Each character's `## <Heading>` is the short, unambiguous identifier the level loader normalizes to a character ID. The full public-facing name lives in `* title=`. This keeps IDs short (no honorifics in IDs) and frees the `title` field to carry the rank a player sees in the cast view:

| Section heading (ID) | `title` field                  | Compartment |
| -------------------- | ------------------------------ | ----------- |
| Pierre Michel        | (defaults to heading)          | Corridor.End |
| Ratchett             | Samuel Ratchett                | 2           |
| MacQueen             | Hector MacQueen                | 3           |
| Masterman            | Edward Masterman               | 4           |
| Foscarelli           | Antonio Foscarelli             | 5           |
| Helena               | Countess Helena Andrenyi       | 6           |
| Rudolph              | Count Rudolph Andrenyi         | 7           |
| Mary                 | Mary Debenham                  | 8           |
| Arbuthnot            | Colonel Arbuthnot              | 9           |
| Hubbard              | Mrs Caroline Hubbard           | 10          |
| Greta                | Greta Ohlsson                  | 11          |
| Schmidt              | Hildegarde Schmidt             | 12          |
| Princess             | Princess Dragomiroff           | 13          |

Itinerary references and solution cloze blanks must use the **`title`** form (e.g. `Princess Dragomiroff @ Compartment 13`, not `Princess @ ...`), because `parseSpeaker` / waypoint lookups match by character title. The section heading is internal.

Cast-size note: design §3 reads "14 characters — 12 conspirators + victim + conductor", but that heading double-counts Pierre Michel (he is both a conspirator and the conductor, one person, not two). The actual cast is 13: 1 victim + 12 conspirators, with Pierre as the 12th conspirator. Cross-referenced against §2's compartment assignments, §4-T3's stab order, §5's clue inventory, and §6's clozes — none reference a 14th character.

### 3. `isTitleKnown=false` for all 13 characters

Every character starts with `isTitleKnown=false` so the auto-generated `identities` cloze (see [src/game/levelLoading/levelSolutionsLoader.ts](../src/game/levelLoading/levelSolutionsLoader.ts) `createGeneratedIdentitySolution`) presents 13 unknowns. Pierre Michel is included even though his uniform is identifying — symmetric treatment keeps the identity puzzle uniform.

Multi-stage identity reveal (iconography → public name → true name) is FU2 follow-up engine work and not in scope for Phase 1.

### 4. Face-sprite URL slugs

All `faceImage` URLs follow `/sprites/<slug>Face.png`. The slugs:

```
pierre, ratchett, macqueen, masterman, foscarelli,
helenaAndrenyi, rudolphAndrenyi, debenham, arbuthnot,
hubbard, ohlsson, schmidt, dragomiroff
```

Last-name lowercase except where disambiguation is needed (`helenaAndrenyi` / `rudolphAndrenyi`) or where the first name is the more recognisable identifier (`pierre`).

The PNG files do not exist yet — ADR 005 falls back to a circle. Sprite creation is FU5.

### 5. Per-character item slugs for recurring objects (WP3+)

Item IDs are level-wide unique (`_assertItemIdIsUnique` in `levelRoomPopulationLoader.ts`). Several object types recur across characters in WP3 — passports, tickets, telegrams, photographs, luggage. To avoid collisions, recurring items use a `<Slug>'s <Object>` title pattern, where the slug is a short, consistent per-character handle:

| Character                | Slug         |
| ------------------------ | ------------ |
| Pierre Michel            | Pierre       |
| Samuel Ratchett          | Ratchett     |
| Hector MacQueen          | MacQueen     |
| Edward Masterman         | Masterman    |
| Antonio Foscarelli       | Foscarelli   |
| Countess Helena Andrenyi | Helena       |
| Count Rudolph Andrenyi   | Rudolph      |
| Mary Debenham            | Mary         |
| Colonel Arbuthnot        | Arbuthnot    |
| Mrs Caroline Hubbard     | Hubbard      |
| Greta Ohlsson            | Greta        |
| Hildegarde Schmidt       | Schmidt      |
| Princess Dragomiroff     | Dragomiroff  |

WP3 examples: `Ratchett's Passport`, `MacQueen's Passport`, `Helena's Passport`, `Mary's Handkerchief`, `Greta's Bible` (if WP3 wants a richer title than the WP2 "Small Bible"; either is fine — pick one and stick with it across the file).

**Carried items added in WP2** that are unique by object type (Master Key, Conductor's Logbook, Silver Flask, Glass Vial, Reticule, Pipe, Pipe Cleaners, Sponge-Bag, Small Bible, Holy Oil Phial, Sewing Kit, Walking Cane, Russian Newspaper) intentionally do **not** carry a slug prefix — there's only one in the level, so the bare object name is unambiguous and reads more naturally. The slug-prefix rule kicks in only when more than one character owns the same kind of object.

### 6. Per-compartment grid tile letters

Each compartment containing a character has a 4×4 grid placing the character at row 1, col 1. Tile letters avoid the map-level legend (`C`, `R`, `1`–`9`, `a`–`d`). Letters are reused across compartments because per-room legends are independent. The corridor uses `P` for Pierre Michel and Compartment 13 uses `P` for Princess Dragomiroff — both load correctly because the corridor's and Compartment 13's grid legends are scoped to their own rooms.

## Consequences

- WP3 examinables will follow §5 slug rules when adding passports, tickets, photographs, and luggage.
- WP4–WP7 itinerary lines must use the **full title** form for each character (`Princess Dragomiroff says "..."`, not `Princess says "..."`).
- If sprite assets are added (FU5), they must use the exact URL slugs in §4. Adding a sprite for `princessFace.png` won't be picked up — the `faceImage` URL says `dragomiroffFace.png`.
- The auto-generated `identities` cloze (13 unknowns) is part of the level's win condition. WP8's authored solutions don't need to include character-identity blanks.

## Related

- [ADR 003](adr-003-waypoint-based-room-navigation.md) — waypoint nearest-match resolution explains why Pierre's starting waypoint may be ~20 units from the `End` marker but still functions as "at the end" for itinerary purposes.
- [ADR 005](adr-005-runtime-image-assets.md) — face-image fallback to circle when the sprite PNG is missing.
- [docs/murder-on-the-orient-express-work-packages.md](murder-on-the-orient-express-work-packages.md) — WP plan that this ADR codifies decisions for.
