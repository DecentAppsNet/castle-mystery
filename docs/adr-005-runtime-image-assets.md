# ADR 005: Runtime Image Assets via GameState ImageSet

## Status

Accepted

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
