# ADR 005: Runtime Image Assets via GameState ImageSet

## Status

Accepted

Character-field names, canonical URL identity, and character-image failure/fallback rules below are historical and superseded by [ADR 010](adr-010-level-asset-filename-normalization.md) and [ADR 021](adr-021-raster-character-assets.md). The synchronous parsing/state-construction and explicit runtime asset-loading boundaries remain accepted.

The update below additionally supersedes the Map representation, blanket resilience policy, per-level GameState ownership, and related implementation notes and consequences. The original decision is retained as historical rationale.

## Revised Asset Boundary

- ImageSet owns asset loading, preparation, and lookup behind an encapsulated boundary. Rendering consumes prepared assets synchronously; it does not initiate loading or repeat visible-content analysis.
- Visible-content bounds are presentation metadata, not a replacement for original source geometry. Decorative padding may be excluded from presentation, but authored joins, tiling, and sprite coordinates must retain their source alignment.
- All directly referenced images must be ready before a level is published to rendering. Any required asset failure rejects preparation rather than publishing a partial set. Optional masks remain optional; omitted artwork remains distinct from failed configured artwork.

### Session Ownership And Retention

Image lifetimes follow the user session rather than an individual level. Shared interface artwork and book content can outlive the level that first required them; a session-owned store allows those consumers to reuse prepared assets without repeated loading.

- The session owns the image store. Level states and renderers hold non-owning references to it; replacing or resetting a level does not replace the store or transfer disposal responsibility. Parsing and state construction remain synchronous and independent of asset I/O, including for headless callers.
- Retention reflects combined demand from explicitly designated session-wide assets, the accepted active level, and current book content. Session-wide lifetime is a semantic designation, not an inference from filenames or directories. The particular assets in each category belong in implementation, not this decision.
- Each domain reports its own canonical image references through its boundary. The image store operates on asset identities and does not understand levels or books. Identity and candidate resolution follow ADR 010; deployment-specific URL expansion remains a network-boundary concern.
- Loading is explicitly coordinated by session orchestration rather than initiated by rendering or hidden behind lookup. Already prepared assets are reused. Development assertions may detect caller mistakes, but orchestration must remain correct without them; the store is not responsible for scheduling concurrent requests.
- Book references establish retention demand, not a separate loading mechanism. They must already be resolved, and book demand collection neither probes alternatives nor loads assets. Book content depends on assets acquired through session-wide or level loading.
- A replacement is accepted only after its required assets and runtime state are ready. Any accompanying book-content changes precede retention calculation, which uses current demand at acceptance rather than a snapshot from before loading. Pruning occurs before replacement rendering, and only after outgoing rendering and cache preparation have stopped using assets that may be released.
- Failed or abandoned preparation leaves outgoing requirements intact. Extra assets acquired by a failed attempt may remain until a later successful acceptance; transactional rollback is not required. Explicit removal releases the decoded resources owned by each removed entry, including optional masks, without initiating loading. Derived caches must not outlive their source resources unless they are independent of them.

## Context

Character face images were introduced to allow authored characters to render with artwork instead of the default circle head.

An initial implementation loaded image assets during level loading and stored decoded image objects directly on `Character`.

That approach created several problems:

- `loadLevelFromText()` became asynchronous even though most level parsing is pure data work
- repeated level loading in tests and helper functions could trigger repeated image loads
- browser-specific decoded image types leaked into gameplay and domain state
- rendering code had to special-case a union type of `ImageBitmap | HTMLImageElement`

At the same time, tests and game-state reconstruction rely heavily on synchronous creation of game-state snapshots from already loaded authored data.

## Decision

We separate authored image references from decoded runtime image assets.

### 1. `Character` stores `faceImageUrl`, not decoded image data

Characters should keep only the authored image reference.

The field should be:

- `faceImageUrl:string|null`

This URL is stored exactly as authored and also serves as the cache key for now.

### 2. Only `ImageBitmap` is used for decoded face images

We do not support a fallback decoded image type such as `HTMLImageElement`.

The decoded runtime asset type is:

- `ImageBitmap`

This keeps browser-specific complexity out of the rest of the codebase.

### 3. Level loading does not load image assets

Neither:

- `loadLevelFromText()`
- `loadLevelFromUrl()`

should perform face-image asset loading.

Their responsibility is to load and parse level data only.

### 4. `GameState` owns an `imageSet`

Decoded image assets needed for rendering are carried on `GameState`.

The intended shape is conceptually:

- `ImageSet = Map<string, ImageBitmap>`

where the key is the authored `faceImageUrl` string.

### 5. Image loading happens outside game-state construction

Game-state creation remains synchronous.

`createGameStateFromLevel()` should be renamed to `createGameState()` and should accept an optional `imageSet` parameter.

If no `imageSet` is provided, `createGameState()` should initialize an empty one. This keeps tests lightweight and preserves a cheap synchronous path for repeated snapshot creation.

### 6. App initialization loads images explicitly before creating game state

The initialization flow should be:

1. load the level
2. create an `ImageSet` from that level
3. create the game state with that `ImageSet`

So initialization code remains the place where runtime asset I/O is orchestrated.

### 7. Rendering resolves images through `gameState.imageSet`

Drawing code should not read decoded image data from `Character`.

Instead, it should:

- read `character.faceImageUrl`
- look up that URL in `gameState.imageSet`
- draw the matching `ImageBitmap` if present
- fall back to the existing circle head if the image is absent

### 8. Image loading is resilient

A failure to load any single image (missing file, non-OK response, decode error, or the absence of `createImageBitmap` itself) must not reject the whole `createImageSetFromLevel()` call. Failed entries are simply omitted from the `ImageSet`, and the renderer's absence-fallback in §7 produces the circle head for those characters.

This is what makes the §7 fallback contract meaningful: rendering can only fall back on absence if the loader is willing to produce a partial `ImageSet` instead of throwing.

## Rationale

This design preserves clean boundaries:

- authored level data stays simple and synchronous
- runtime asset loading remains explicit
- gameplay state does not depend on browser image object details
- tests can construct levels and game states without network or image decode work
- repeated snapshot helpers do not implicitly trigger asset loading

Using the authored URL as the cache key is an acceptable short-term tradeoff for the current demo-stage codebase, even though it may permit duplicate loads if authors use inconsistent path spellings.

## Consequences

### Positive

- `loadLevelFromText()` can remain synchronous
- tests and integration helpers avoid repeated image-loading overhead
- `Character` and related gameplay logic no longer depend on decoded browser image types
- `GameState` becomes the single runtime carrier for render assets
- asset loading is explicit in app initialization rather than hidden in parsers or state constructors

### Negative

- rendering now depends on both character data and `gameState.imageSet`
- initialization gains an extra explicit step to build the `ImageSet`
- inconsistent authored URL spellings may lead to duplicate cache entries until normalization or stable asset ids are introduced
- browsers without usable `ImageBitmap` support get an empty `ImageSet` and render every character as a circle (per §8); they do not fail init

## Implementation Notes

Implementation should follow these principles:

1. Replace `Character.faceImage` with `Character.faceImageUrl`.
2. Introduce an `ImageSet` type, likely in a focused utility or type module.
3. Add a helper that scans a loaded level for unique face-image URLs and loads them into an `ImageSet`. The helper catches per-URL load failures and omits the failed entries rather than rejecting the whole load (see §8).
4. Rename `createGameStateFromLevel()` to `createGameState(level, imageSet?)`.
5. Default `imageSet` to an empty set when omitted.
6. Add `imageSet` to `GameState`.
7. Update drawing code to resolve images through `gameState.imageSet` using `character.faceImageUrl`.
8. Keep the existing circle fallback whenever no matching image is available.

## Not Chosen

### Decoded image objects stored directly on `Character`

Not chosen.

Reason:

- it leaks rendering/runtime objects into domain data
- it complicates copying and testing
- it couples level parsing to browser asset concerns

### Async image loading inside `loadLevelFromText()`

Not chosen.

Reason:

- it makes core parsing asynchronous without enough benefit
- repeated test helpers can pay the asset-loading cost many times
- it mixes authored data parsing with runtime asset acquisition

### Asset loading inside `createGameState()`

Not chosen.

Reason:

- game-state construction should stay synchronous and cheap
- snapshot creation is used repeatedly in tests and runtime state reconstruction
- hidden I/O in state creation would be hard to reason about

### Additional face-image ids separate from the authored URL

Not chosen for now.

Reason:

- the authored URL is sufficient as a practical temporary key
- adding a separate id layer is extra maintenance before it provides enough value
