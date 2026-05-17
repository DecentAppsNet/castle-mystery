# ADR: Orient Express Level — Conductor Placement, Cast IDs, and Item-Slug Scheme

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

Itinerary references must use the **section-heading (id) form** (e.g. `Princess @ Compartment 13`, *not* `Princess Dragomiroff @ ...`), because [src/game/levelLoading/levelItineraryLoader.ts](../src/game/levelLoading/levelItineraryLoader.ts) `_parseCharacterActivityLine` normalizes the leading text and looks it up against `Character.id` via `charactersById.get(...)`. There is no title-based fallback (verified against the engine in WP4 — an earlier revision of this ADR claimed lookups matched by title, which surfaced as `unknown character 'antonio foscarelli' in itinerary` when WP4 first tried the full-title form). Compartment / room legend tile entries (`V=Ratchett`, `M=MacQueen`, …) use the same id form for the same reason.

Solution cloze blanks reference characters by their **title** (the `[character]` blank is matched against the auto-generated `characters` category list, which is built from `character.title` — see [levelUtil.ts:34-43](../src/game/levelLoading/levelUtil.ts#L34-L43)). So `[Princess Dragomiroff]` in a cloze is correct, but `Princess Dragomiroff says "..."` in an itinerary is not.

Cast-size note: design §3 reads "14 characters — 12 conspirators + victim + conductor", but that heading double-counts Pierre Michel (he is both a conspirator and the conductor, one person, not two). The actual cast is 13: 1 victim + 12 conspirators, with Pierre as the 12th conspirator. Cross-referenced against §2's compartment assignments, §4-T3's stab order, §5's clue inventory, and §6's clozes — none reference a 14th character.

### 3. `isTitleKnown=false` for all 13 characters

Every character starts with `isTitleKnown=false` so the auto-generated `identities` cloze (see [src/game/levelLoading/levelSolutionsLoader.ts](../src/game/levelLoading/levelSolutionsLoader.ts) `createGeneratedIdentitySolution`) presents 13 unknowns. Pierre Michel is included even though his uniform is identifying — symmetric treatment keeps the identity puzzle uniform.

Multi-stage identity reveal (iconography → public name → true name) is FU2 follow-up engine work and not in scope for Phase 1.

### 4. Face-sprite mapping uses the three existing template sprites

Until per-character art lands (FU5), every character's `faceImage` URL points at one of the three sprites that already exist in `public/sprites/`:

- `/sprites/jesterFace.png` — Pierre Michel (the conductor)
- `/sprites/kingFace.png` — every male conspirator + Ratchett: MacQueen, Masterman, Foscarelli, Rudolph, Arbuthnot
- `/sprites/queenFace.png` — every female conspirator: Helena, Mary, Hubbard, Greta, Schmidt, Princess

The three-way split gives just enough visual differentiation for the cast view (the conductor stands apart; men and women are distinguishable) while avoiding the dev-server image-decode crash that earlier per-character placeholder URLs caused (see [ADR 005](adr-005-runtime-image-assets.md) §8 for the resilience fix that now also makes missing sprites non-fatal). The shared URL is the cache key, so `createImageSetFromLevel` makes exactly three fetches.

When FU5 produces real per-character art, the planned per-character URL slugs are:

```
pierre, ratchett, macqueen, masterman, foscarelli,
helenaAndrenyi, rudolphAndrenyi, debenham, arbuthnot,
hubbard, ohlsson, schmidt, dragomiroff
```

(last-name lowercase except where disambiguation is needed, or where the first name is the more recognisable identifier). FU5 swaps the shared URLs above for these per-character ones.

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

### 7. Itinerary timestamp pattern (WP4+)

WP4 implemented the T1 dinner timeline starting at 19:30:00. The choice raised in `docs/murder-on-the-orient-express-work-packages.md` WP4 §1 — keep `time=19:30` vs shift it back vs shift the first `@` later — resolved to **"neither needed"**: keep `time=19:30` in `# general` and use absolute `H:MM:SS` timestamps such as `19:30:00 Samuel Ratchett @ Restaurant Car.T1` for each character's first activity.

The engine's per-character `state.time` starts at 0, and absolute itinerary timestamps are milliseconds since midnight (≈70.2M ms for 19:30:00). A back-planned walk that "begins before" dinner-start in clock terms still has its `startTime` at a large positive millisecond value — well above 0 — so `scheduleEventsToEndAtTime`'s `scheduledStartTime < earliestStartTime` guard does not fire.

WP5+ should follow the same pattern:

- `time=19:30` stays put — it is the displayed clock origin, not the simulation origin.
- Use absolute `H:MM:SS` for cross-character anchors and beat boundaries (e.g. `21:00:00 Hector MacQueen says "..."`).
- Use `:` for sequential dialogue inside a single scene, per ADR 004.
- For same-timestamp arrivals at the same room (13 characters @ Restaurant Car at 19:30:00 worked cleanly in WP4), trust the engine's per-character occupied-waypoint spreading from ADR 003 rather than pre-staggering by seconds.

### 8. Corridor position markers (WP5+)

WP5 expanded the corridor's per-room grid from `1×26` to `2×26` and added position markers that every later WP can address by name. The expansion was done once, up front, so WP6 and WP7 can target compartment-adjacent corridor positions without re-editing the grid.

The corridor grid is:

```
PE.......................V
.a.b.c.d.e.f.g.h.i.j.k.l.m
```

Row 0 columns 0–1 preserve the existing `P=Pierre Michel` and `E=End` markers in their original positions (per §1). Row 0 column 25 is `V=Vestibule`, a narrative anchor at the far end of the carriage — there is no Vestibule room and no exit-locking mechanic; Pierre's "lock the vestibule" beat in T2 is modelled as a walk to `Corridor.Vestibule`, a `says` line, and a walk back to `Corridor.End` (no door state changes).

Row 1 places one `OutsideN` marker per compartment, at the grid column directly below that compartment's left edge:

| Marker     | Tile | Compartment overhead |
| ---------- | ---- | -------------------- |
| Outside1   | `a`  | Compartment 1        |
| Outside2   | `b`  | Compartment 2        |
| Outside3   | `c`  | Compartment 3        |
| Outside4   | `d`  | Compartment 4        |
| Outside5   | `e`  | Compartment 5        |
| Outside6   | `f`  | Compartment 6        |
| Outside7   | `g`  | Compartment 7        |
| Outside8   | `h`  | Compartment 8        |
| Outside9   | `i`  | Compartment 9        |
| Outside10  | `j`  | Compartment 10       |
| Outside11  | `k`  | Compartment 11       |
| Outside12  | `l`  | Compartment 12       |
| Outside13  | `m`  | Compartment 13       |

These markers are addressed in itinerary as `<character> @ Corridor.OutsideN` (e.g. `Pierre Michel @ Corridor.Outside10` for Mrs Hubbard's first bell at 22:15). Items dropped while a character stands on an OutsideN waypoint end up on the corridor floor at roughly that compartment's door — the placement used by WP5 for the Pipe Cleaner Decoy at Outside8 and planned by WP6 for the Brass Uniform Button (Outside2), the Pipe Cleaner Real (Outside2), and other T3 trace placements.

Per-room legend tile letters `a`–`m` on the corridor are scoped to the corridor's own grid (per §6) and do not conflict with the map-level `a`–`d` tiles used for Compartments 10–13. Pierre's starting waypoint shifts from y≈50 (1-row grid centre) to y≈45 (top half of the 2-row grid); both resolve to `Corridor.End` via ADR-003's nearest-waypoint rule because P and E remain in the same row, ~20 units apart in x.

### 9. HTML comments in the itinerary section must not start a line with `HH:MM`

`_parseItineraryActivities` in [src/game/levelLoading/levelItineraryLoader.ts](../src/game/levelLoading/levelItineraryLoader.ts) runs `parseLeadingTimestampOrThrowOnInvalid` against every line in the `# itinerary` section, **including lines inside `<!-- ... -->` HTML comments**. The parser only looks at the first whitespace-delimited token; it has no notion of comment scope.

Consequence: any comment line whose first non-whitespace token matches `[0-9]+:...` (e.g. `22:30 MacQueen leaves...`, `22:45) and Pierre answers...`, `21:05 Ratchett/MacQueen dictation`) is parsed as an absolute-timestamp activity. If the rest of the line lacks an activity marker (` @ `, ` says `, ` wanders`, ` gives `, ` drops `, ` takes `) — which a narrative sentence almost never has — level loading fails with `unable to parse itinerary activity line '...'` or `invalid timestamp: ...)`.

Lines that begin with `<!--` are safe because `<!--` is the leading token and is not digit-prefixed. The hazard is only line-internal text that wraps a timestamp to a fresh line.

Authoring rules for WP6+:
- In narrative HTML comments inside `# itinerary`, never let a `HH:MM` or `HH:MM:SS` token sit at the start of a line. Reword (`half-past ten`, `the bell at 22:15`, `the dictation at 21:05`) or rewrap so the timestamp is mid-line.
- The FU1 privacy markers used by WP5 (`<!-- FU1: POV-private at Compartment 2 -->`) deliberately omit timestamps so they cannot trip this gotcha regardless of where they wrap.
- Activity lines themselves (the things the parser *should* see) follow the normal rules: `HH:MM:SS character @ room` / `: character says "..."`.

### 10. Cloze narrative text must not contain parenthesised tokens with no whitespace inside

`_isImageToken` in [src/game/levelLoading/levelSolutionsLoader.ts:61](../src/game/levelLoading/levelSolutionsLoader.ts#L61) treats any `(...)` segment whose trimmed contents are non-empty and contain no whitespace as an image-token reference, regardless of context. `_findNextSpecialToken` picks the earliest token, so an `(X)` ahead of a `[blank]` is consumed first and rendered as an image with `imageUrl='X'`.

Consequence: cloze `clozeStatement=` text like `... outside #8 (T2): [planted].` parses as `text + image{imageUrl:'T2'} + text + blank{planted}` — the literal "T2" is replaced by a (broken) image placeholder, and the blank still works but the rendered sentence is wrong.

Authoring rules for WP8+:
- In `clozeStatement=` narrative, prefer prose like `at T2`, `during T3`, or use em-dashes — anything that either drops the parens or inserts whitespace inside them.
- Parens whose contents contain whitespace are safe (`(left to mislead)`, `(an unavoidable trace of the truth)` all pass through as plain text).
- The hazard is symmetric to §9: in both cases the parser greedily classifies tokens by surface shape with no awareness of surrounding context.

## Consequences

- WP3 examinables will follow §5 slug rules when adding passports, tickets, photographs, and luggage.
- WP4–WP7 itinerary lines must use the **section-heading (id) form** for each character (`Princess says "..."`, not `Princess Dragomiroff says "..."`). Cloze solutions use the title form.
- WP5+ itinerary lines target the corridor's compartment-adjacent positions via `Corridor.OutsideN` (1≤N≤13) and the narrative anchor `Corridor.Vestibule`, both defined once in the §8 grid expansion. Do not re-expand the corridor grid in WP6/WP7.
- WP6+ narrative HTML comments inside the `# itinerary` section must keep timestamps off line starts (per §9) — every line in that section is parsed for a leading-timestamp pattern, comments included.
- WP8+ cloze `clozeStatement=` narrative must avoid `(X)` patterns whose parens enclose whitespace-less content (per §10) — those are parsed as image tokens and render as broken image placeholders.
- New characters added to this level (or characters whose `faceImage` is changed during ongoing work) must reuse one of the three shared sprite URLs in §4 unless the change is part of FU5. Don't reintroduce per-character placeholder URLs pointing at nonexistent files — that's what caused the prior `InvalidStateError` decode crash.
- When FU5 produces real per-character art, swap the shared sprite URLs for the per-character slugs listed at the bottom of §4.
- The auto-generated `identities` cloze (13 unknowns) is part of the level's win condition. WP8's authored solutions don't need to include character-identity blanks.

## Related

- [ADR 003](adr-003-waypoint-based-room-navigation.md) — waypoint nearest-match resolution explains why Pierre's starting waypoint may be ~20 units from the `End` marker but still functions as "at the end" for itinerary purposes.
- [ADR 005](adr-005-runtime-image-assets.md) — face-image fallback to circle when the sprite PNG is missing.
- [docs/murder-on-the-orient-express-work-packages.md](murder-on-the-orient-express-work-packages.md) — WP plan that this ADR codifies decisions for.
