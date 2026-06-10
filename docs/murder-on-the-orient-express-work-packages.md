# Murder on the Orient Express — Level Implementation Work Packages

Phased plan for translating the Murder-on-the-Orient-Express level design (Inspired by Agatha Christie, 1934) into the engine. Each WP is sized for one Claude Code session, sequential, and produces a level file that still loads cleanly (no `LoadLevelException`) at the end of the session.

The design document lives in conversation context for now — when you spawn a session for a WP, paste the relevant section (`§N`) of the design into the prompt along with this file path.

## Engine-support audit (what's free vs what needs follow-up)

Engine reference points:
- Level format orchestrator: [src/game/levelLoading/levelUtil.ts](../src/game/levelLoading/levelUtil.ts)
- Room geometry, map grid, exits, waypoints: [src/game/levelLoading/levelRoomLayoutLoader.ts](../src/game/levelLoading/levelRoomLayoutLoader.ts)
- Characters, items, room population: [src/game/levelLoading/levelRoomPopulationLoader.ts](../src/game/levelLoading/levelRoomPopulationLoader.ts)
- Itinerary parsing & relative timestamps: [src/game/levelLoading/levelItineraryLoader.ts](../src/game/levelLoading/levelItineraryLoader.ts)
- Cloze conclusions: [src/game/levelLoading/levelConclusionsLoader.ts](../src/game/levelLoading/levelConclusionsLoader.ts)
- Activity types supported today: `@ <room>` / `@ <room>.<marker>`, `says "..."`, `wanders`, `gives <item> to <recipient>`, `drops <item>`, `takes <item>` (see [src/game/activities/](../src/game/activities/))
- Working example: [public/levels/kingacide.md](../public/levels/kingacide.md)
- Cross-cutting ADRs: 001 (timestamp resolution), 003 (waypoints), 004 (`:`-relative timestamps), 005 (ImageSet), 006 (TimeSlider markers — Proposed)

**Supported today:**
- Multi-room maps with per-room grids, legends, and position markers
- Exits between rooms with door modifiers (`lockable|unlockable|closed|open|locked|unlocked`)
- Characters: title, description, inventory items, `faceImage` URL, `isTitleKnown` boolean
- Items: title, description, `displayChar`
- Itinerary with absolute and `:`-relative timestamps; same-timestamp pose resolution (ADR 001)
- Cloze conclusions with `[blank]` syntax, `---` separators, `(url)` image tokens, `actions=` and other category lists, and `unlockForItem` / `unlockForConclusion` prerequisites
- Auto-generated `identities` cloze that asks the player to match face → public name

**Not supported today (Phase 2 / followup engine work):**
- POV-gated witnessing — events that fire only when the player is "following" a specific character
- Multi-stage identity reveal (iconography → public name → true name); `isTitleKnown` is a single flip
- Bonus-cloze unlock conditions beyond `unlockForItem` / `unlockForConclusion` (e.g. "examined ≥3 Armstrong items", "POV-switched ≥8 conspirators")
- Custom interactive art for items (e.g. the wound-count diagram on Ratchett's body)
- A "discovery" mechanic distinct from cloze answering (the design talks about clues "unlocking" identities)
- 14 face-sprite assets — ADR 005 falls back to circle, so we can leave `faceImage` URLs pointing at nonexistent files and the level still works visually

For each item the design assigns to "POV-only" witnessing, the Phase 1 implementation treats it as a normal itinerary event that any character in the same room can witness. The dialogue and movement still play; only the privacy constraint is degraded. Flag these in commit messages so they're easy to harden in FU1.

---

## Phase 1 — Engine-supported, sequential WPs

Each WP edits `public/levels/murder-on-the-orient-express.md` and may add docs. After each WP, the level should load via `npm run dev` and visually render. Use `npm test` for any regressions in level-loading unit tests.

### WP1 — Map skeleton

**Goal.** Replace the current 3-room stub with the full 15-room layout: 13 numbered compartments, a corridor, and a restaurant car. No characters, items, or itinerary yet.

**Inputs.** Design §2.

**Design choices to make in this WP:**
- Compartment naming. Suggest thematic-but-numbered names so cloze blanks read well later (`Compartment 1`, `Compartment 2`, …, `Compartment 13`). The mandatory cloze wants "in compartment 2" — verify the chosen name makes that natural.
- Map-tile letter assignment. Single-character tile IDs preserve case (1-char rule in [src/game/idUtil.ts](../src/game/idUtil.ts#L7)); we have 15 rooms but only 26 lowercase + 26 uppercase letters, so it fits comfortably. Suggest digits `1`–`9` then `a`–`d` for the compartments; `C` for corridor; `R` for restaurant car.
- Corridor geometry. A single long room, ~30 tiles wide. The conductor (#1) "is" the front end of the corridor per design §2 note; model it as a separate small room adjoining the corridor or as a named position marker `COR-end` inside the corridor. The marker approach is simpler and matches how Library/SW etc. work in [kingacide.md:97-99](../public/levels/kingacide.md#L97-L99).
- Restaurant Car connects only to the corridor, at the rear end.
- The "vestibule" is described as locked from T2 onward. Phase 1 can model it as a room with a `locked` exit modifier, or omit it (no character ever leaves through it). Recommend omitting for now and adding back in WP5 only if needed.

**Acceptance.**
- `npm test` passes.
- Level loads in the browser; all 15 rooms reachable from one another via the corridor (or restaurant car).
- Empty `# characters`, `# items`, `# itinerary`, `# conclusions` sections — file still loads.

**Files.** `public/levels/murder-on-the-orient-express.md`.

**Risks.** Grid width — at 32+ tiles wide the corridor may need careful legend and marker placement so authored positions remain readable. Read [src/game/levelLoading/levelRoomLayoutLoader.ts](../src/game/levelLoading/levelRoomLayoutLoader.ts) for grid scale rules.

---

### WP2 — Characters with public personas and signature inventory

**Goal.** Add all 14 characters (12 conspirators + victim + conductor) with `description`, `faceImage`, and the inventory each carries at level start.

**Inputs.** Design §3 (cast table) plus §5 (which characters carry which signature item at T1: MacQueen's flask, Masterman's vial, Greta's holy-oil phial, the Princess's cane and Russian newspaper, Schmidt's sewing kit, Mrs Hubbard's sponge-bag, Mary Debenham's reticule, Pierre Michel's master key and logbook).

**Design choices:**
- `isTitleKnown` — set to `false` for all conspirators (so they show iconography until identified). Pierre Michel and Ratchett: design says Ratchett is "the elderly American gentleman" — also `false`. Pierre is the conductor — could be `true` since uniform is identifier enough; or `false` for symmetry. Suggest `false` across the board; the auto-generated `identities` cloze (see [levelConclusionsLoader.ts:224](../src/game/levelLoading/levelConclusionsLoader.ts#L224)) handles the reveal.
- `faceImage` URLs — point at `/sprites/<name>Face.png` for each. The files don't exist yet; ADR 005 fall-back renders a circle.
- Position markers — add a position marker for each conspirator in their compartment (the legend tile that puts them at their starting pose), e.g. `R=Ratchett` inside `## Compartment 2`. Pierre Michel starts at `COR-end`.

**Acceptance.**
- All 14 characters present in the cast.
- Each character is drawn in their compartment at time 0.
- Generated `identities` cloze appears in the conclusions panel showing 14 unknowns.

**Files.** `public/levels/murder-on-the-orient-express.md`.

**Risks.** Item IDs are level-wide unique (see the previous "duplicate item id 'chair'" incident). Several conspirators carry similarly-named items (Mrs Hubbard's "sponge-bag", Mary's "reticule", Schmidt's "sewing kit"). Pick distinct titles up front.

---

### WP3 — Examinable clue items

**Goal.** Add the ~40 examinables from §5 (and the "items to add" addendum at the end of §5) as items placed inside the appropriate compartment via room legends.

**Inputs.** Design §5 — the full clue inventory table plus the "Name and identity-revealing evidence" sub-table.

**Design choices:**
- Tile letters — each compartment grid will need 3–8 distinct legend letters. Lower-case suggested for items, upper-case for characters (matches kingacide convention).
- Items that exist on the dropped/planted clue trail but aren't placed until T3 (the broken pocket watch on Ratchett's bedside, the lace handkerchief under the pillow, the brass uniform button in the corridor, the pipe-cleaners) — model as room-placed items here. Their being "dropped" by a character during T3 can be expressed in the itinerary via `takes`/`drops` if the engine timing makes sense; if not, just place them in the final-state location and accept that they're visible from t=0 in Phase 1. Mark these in a comment as candidates for itinerary-driven placement in WP6.
- Compartment-internal location names ("doorframe", "wardrobe", "ashtray", "bedside drawer", "under pillow") — the engine doesn't model sub-furniture; items are at a grid position. Pick a reasonable grid cell and put the descriptive flavour in the item's `description`.
- The "body" of Ratchett — model as a standalone item in Compartment 2 with `displayChar=☠` and the wound count in the description. The interactive wound diagram is FU4.

**Acceptance.**
- All listed items render in their compartments.
- No duplicate-item-id loader errors.
- `description` fields are written and readable.

**Files.** `public/levels/murder-on-the-orient-express.md`.

**Risks.** Volume — ~40 items. Easy to typo a tile letter. Keep legend assignment consistent across compartments (`p=Passport` everywhere a passport exists, etc.) — note: same-id items in different rooms still trigger the duplicate check, so each passport needs a unique title (`Ratchett's Passport`, `MacQueen's Passport`, …).

---

### WP4 — T1 dinner itinerary

**Goal.** Implement the dinner timeline §4-T1: all 14 characters in Restaurant Car, four blocks of dialogue, MacQueen's coffee flask, Masterman's water vial.

**Inputs.** Design §4-T1.

**Design choices:**
- Restaurant Car internal position markers — `T1`–`T5` (five tables) plus `SVC` (service tables at the back). Seating per §4-T1.
- Time anchor — the engine uses an absolute clock starting at the level's `time=` value. The design uses 19:30 as dinner start. Use `time=19:30` in `# general` and absolute itinerary timestamps like `19:30:00 …`. Verify [parseTimestampToMsecs](../src/common/timestampUtil.ts) accepts that form. Fallback: shift everything to a `00:00` anchor and convert in your head while writing.
- Modeling the dosing — MacQueen pours from his flask: `MacQueen gives Silver Flask to Ratchett` is misleading (he doesn't really hand it over). Cleaner: `MacQueen says "Coffee, sir? I brought your usual cream."` followed by no explicit drug-application event, with the flask remaining in MacQueen's inventory. The flask is the witnessed-clue item in WP3, and the "drugging" is implicit. Same for Masterman's vial. Flag this in a comment for FU1.
- Private vs public dialogue — every line plays for any same-room character in Phase 1. The Mary/Arbuthnot whisper at 19:45 will be heard by anyone at adjacent tables; same for the Andrenyis at 20:20. Acceptable degradation; flag for FU1.

**Acceptance.**
- All 14 characters move from compartments to the Restaurant Car by 19:30.
- All dialogue lines fire in order.
- At 21:00 the diners start leaving toward their compartments (this WP can stop at 21:00 or carry through the §4-T1 closing line — pick the cleaner cut).

**Files.** `public/levels/murder-on-the-orient-express.md`.

**Risks.** Volume of dialogue (~30 lines). Quoted speech must close properly — recall the earlier "missing closing quote" loader error. Each `says` value goes through punctuation normalization (see [_normalizeSpeechActivityText](../src/game/levelLoading/levelItineraryLoader.ts#L96)) — long lines should be OK but apostrophes inside quotes need testing.

---

### WP5 — T2 settling itinerary

**Goal.** Implement the 21:00–23:30 wind-down: diners return to compartments, the bell-rings, the Tolstoy reading shuttle, the corridor smoke break, the vestibule lock.

**Inputs.** Design §4-T2 (location grid + beats).

**Design choices:**
- Use `:`-relative timestamps liberally for sequential dialogue inside one scene (matches the kingacide pattern). Use absolute timestamps for cross-character anchors (e.g. `22:30:00 Pierre Michel @ Corridor.End`).
- The Andrenyis' "Take this. Sleep deeply." at 21:30 is heard by both of them only — degrade to in-room dialogue, flag FU1.
- The pipe-cleaner drop at 21:40 — model as `Colonel Arbuthnot drops Pipe Cleaner Decoy` placed in the corridor. Requires WP3 to have created `Pipe Cleaner Decoy` in Colonel Arbuthnot's inventory.
- Vestibule lock — if the vestibule room was added in WP1, model as `Pierre Michel @ Vestibule` then `Pierre Michel @ Corridor.End`. If omitted, just narrate via dialogue.
- Mrs Hubbard's bell at 22:15 and 22:45 — there's no "bell" activity; play it as dialogue beats only (`Mrs Hubbard says "Monsieur Michel..."` then `Pierre Michel @ Corridor.10` etc.).

**Acceptance.**
- At 23:30 every character is in their own compartment (`#2`–`#13`) and Pierre Michel is at `Corridor.End`.
- The decoy pipe-cleaner item ends up at `Corridor.Outside8`.

**Files.** `public/levels/murder-on-the-orient-express.md`.

**Risks.** Time-resolution edge cases — if a same-timestamp burst has many characters all `@`-ing different rooms, watch ADR 001's deterministic-order rule. Spread out by even 1 second when in doubt.

---

### WP6 — T3 murder hour itinerary

**Goal.** The 12 conspirator visits to Compartment 2, in order, with whispers and trace placements; the 02:00–02:35 cleanup with Schmidt swapping the brass button.

**Inputs.** Design §4-T3 movement log.

**Design choices:**
- Each visit is a `@ Compartment 2`, then a `says "<whisper>"`, then a `@ <own compartment>`. The whisper is in-language per design.
- Traces are item drops: `Greta Ohlsson drops Holy Oil Thumbprint`, `Princess Dragomiroff drops Lace Handkerchief`, `Colonel Arbuthnot drops Pipe Cleaner Real`, `Pierre Michel drops Brass Uniform Button`. Each item must exist in the dropping character's inventory at WP2 or be moved via a takes-from-room dance.
- The broken watch — model as `Hector MacQueen takes Pocket Watch` then `Hector MacQueen drops Pocket Watch` to make the watch's final position visible. The "advance to 01:15 and crack the glass" is description-only.
- Mrs Hubbard's dagger hide — `Mrs Hubbard takes Bloody Dagger` (the dagger was placed in #2 in WP3 — verify). Final state: dagger is in Mrs Hubbard's inventory, which the player can examine when they reach #10.
- Count Andrenyi's kimono — `Count Andrenyi takes Scarlet Kimono` from #6, then later `Count Andrenyi drops Scarlet Kimono`. Acceptable degradation: the wear-then-remove choreography is description-only.
- Schmidt button swap at ~02:25 — `Hildegarde Schmidt @ Compartment 1`, dialogue beat, then return. The swap itself is metadata in item descriptions (the "spare" button in #12 is actually the original).

**Acceptance.**
- Every conspirator visits Compartment 2 once and returns to their compartment.
- Trace items are in their expected final locations.
- The level itinerary duration is roughly 7+ hours from level start.

**Files.** `public/levels/murder-on-the-orient-express.md`.

**Risks.** The pose-at-timestamp resolution (ADR 001) — characters arriving at #2 simultaneously will be ordered by ADR 001's tiebreak; design says they visit one at a time so timestamps should be unique anyway. Verify each visit has a distinct timestamp.

---

### WP7 — T4 discovery itinerary

**Goal.** 06:45–07:00 bell-ringing, body discovery, procession into Restaurant Car.

**Inputs.** Design §4-T4.

**Design choices:** mostly dialogue + a chain of `@` moves. Pierre Michel ends at `Corridor.Compartment2`, every other surviving character ends in the Restaurant Car. Ratchett does not move (he's dead).

**Acceptance.**
- At end of itinerary, conspirators are all in RES; PM at COR-2; Ratchett (the body) in #2.
- Itinerary stabilizes (no `unable to resolve relative itinerary timestamps` error).

**Files.** `public/levels/murder-on-the-orient-express.md`.

---

### WP8 — Conclusions (clozes)

**Goal.** Implement the mandatory cloze 6a and the three bonus clozes 6b/6c/6d, with whatever unlock conditions the engine supports.

**Inputs.** Design §6.

**Design choices:**
- Define category lists in the conclusions preamble (kingacide does `actions=...`). Murder on the Orient Express needs at least: `numbers=one|two|...|twelve`, `substances=chloral hydrate|...`, `relationships=mother|grandmother|sister|aunt|godmother|...`, `roles=district attorney|valet|chauffeur|governess|nurse|cook|officer|batman|friend|godmother|old friend`, `containers=sponge-bag|...`. The engine auto-creates `characters`, `items`, `rooms` categories from level data ([levelUtil.ts:34-43](../src/game/levelLoading/levelUtil.ts#L34-L43)); compartment names will be in `rooms`.
- For accepted-alternative answers ("valet (accept batman)", "officer (accept friend)") — the engine supports multiple correct answers per blank via `|`-separated values inside the brackets, e.g. `[valet|batman]`. Confirm in [levelConclusionsLoader.ts:137](../src/game/levelLoading/levelConclusionsLoader.ts#L137).
- Mandatory cloze 6a — single conclusion titled "What happened on the Orient Express". No `unlockFor*` (it's the main puzzle).
- Bonus 6b "The Armstrong dossier" — design says unlock after examining ≥3 Armstrong-connection items. The engine only supports `unlockForItem` (a single item). Compromise: `unlockForItem=Theatre Programme` (the most distinctive Armstrong item). Flag for FU3.
- Bonus 6c "The order of the visits" — design says unlock after POV-switching ≥8 conspirators. No engine support; fall back to `unlockForConclusion=What happened on the Orient Express` (must solve mandatory first). Flag for FU3.
- Bonus 6d "Planted, accidental, or genuine?" — design says unlock after examining ≥10 clues. Fall back to `unlockForConclusion=The Armstrong dossier`. Flag for FU3.
- The level's win condition is "all unlocked conclusions complete" per [HomeScreen.tsx](../src/homeScreen/HomeScreen.tsx#L33-L35). Mandatory + the auto-generated identities cloze must both be solvable for the level to win. The bonuses are locked behind mandatory in the proposal above so the win remains achievable.

**Unlock-chain — load-bearing choice.** Use `unlockForItem=Theatre Programme` on 6b rather than chaining 6b off 6a, because the engine treats locked conclusions as not-required for level completion (`_isLevelComplete` in [HomeScreen.tsx](../src/homeScreen/HomeScreen.tsx)). With this chain:
- A player who solves identities + 6a + 6c — never examining the Theatre Programme — wins. 6b and 6d stay locked, so the win condition ignores them.
- A player who *also* examines the Theatre Programme unlocks 6b, which (if solved) unlocks 6d, which must then also be solved to win.

That makes 6b/6d genuinely optional via the player's exploration path. A strictly linear chain (6a → 6b → 6c → 6d) would force all four bonuses every time, breaking the design's "skipped bonus shouldn't block win" contract. The Theatre Programme is the most distinctive Armstrong clue in #10 (Linda Arden's stage name), so gating "the Armstrong dossier" cloze behind it reads naturally as discovery-driven rather than artificial.

**Cloze narrative authoring (§10 of conventions ADR).** When phrasing the `clozeStatement=` text, avoid parens with no whitespace inside (`(T2)`, `(X)`) — the cloze parser misreads those as image tokens. Reword (`at T2`, `during T3`) or insert a space. Parens whose contents contain whitespace (`(left to mislead)`) are fine.

**Acceptance.**
- All four clozes render in the conclusions panel.
- Mandatory unlocks immediately; bonuses lock per the chosen `unlockFor*` chain.
- Filling the mandatory cloze with the §6a conclusion validates correctly.
- Level reaches `isLevelComplete=true` after mandatory + identities are solved.

**Files.** `public/levels/murder-on-the-orient-express.md`.

**Risks.** `validateUnlockPhrases` in [levelUtil.ts:163](../src/game/levelLoading/levelUtil.ts#L163) checks every cloze answer phrase exists in some category list. Every literal in every `[blank]` must match a category — easy to miss "Goldenberg" or "Susanne" (proper names from the design). Add them to authored category lists rather than rely on auto-generated ones.

---

## Phase 2 — Follow-up engine work

Each FU is a larger session — touches `src/` rather than the level file. Spawn these only after Phase 1 is complete and the level is fully playable in degraded form.

### FU1 — POV-gated witnessing
Add an `observerCharacterId` field (or similar) to `ItineraryEvent` so dialogue and item-interaction events can be marked private to a specific POV. Update the renderer + the TimeSlider marker derivation (ADR 006) to filter by current POV. Migrate the WP4–WP6 dialogue lines flagged as POV-only.

### FU2 — Multi-stage identity reveal
Extend `Character` with `trueTitle` / `isTrueTitleKnown` (or a small enum). Update the cast view to show iconography → public name → true name. Add a discovery mechanic so examining a "true-identity" clue item flips a flag on the linked character. Add a generated "true identities" cloze parallel to the existing `identities` cloze.

### FU3 — Custom cloze unlock conditions
Generalize `unlockForItem` / `unlockForConclusion` to a list of predicates: `unlockAfterItemsExamined=Theatre Programme|Regimental Photo|Greta's Bible`, `unlockAfterPovSwitches=8`, etc. Update `Conclusion.isLocked` evaluation. Wire WP8's bonus clozes to use the real conditions.

### FU4 — Interactive wound diagram
A custom item viewer for "Ratchett's Body" that shows the 12 wound points with hoverable detail. Probably a new `Item.viewer` field that the UI dispatches on; default is the standard description popup.

### FU5 — Sprite assets
14 `<character>Face.png` files at `public/sprites/`. Style consistent with the existing king/queen/jester faces. Out of scope for code-only sessions but cheap to do alongside FU1.

---

## Recommended firing order

WP1 → WP2 → WP3 → WP8 → WP4 → WP5 → WP6 → WP7

Rationale: doing WP8 (conclusions) right after the structural pieces lets you confirm the cloze + identities-cloze flow works end-to-end before committing to the multi-hour timeline of WP4–WP7. If a cloze design issue surfaces, it's caught with one hour of itinerary work to rewrite, not seven.

After WP1, run `npm test` — the test suite covers the level loaders and will catch grid/exit regressions early.
