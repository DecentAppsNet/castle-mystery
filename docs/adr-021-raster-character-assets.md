# ADR 021: Raster Character Assets

## Status

Accepted. Amends [ADR 005](adr-005-runtime-image-assets.md), [ADR 010](adr-010-level-asset-filename-normalization.md), and [ADR 020](adr-020-character-body-parts.md).

## Decision

Support exactly two authored configurations: default vector geometry with an optional raster head, or a complete six-part raster body. The [level format](../LEVEL_FORMAT.md#raster-bodies) defines the 23 required properties and validation rules; the [Krita exporter](../kritaPlugin/README.md) produces compatible PNGs and metadata.

### References And Runtime Assets

- `Character.faceImageUrl` is removed. Readonly body parts own nullable `imageUrl` values; skins own nullable `headImageUrl` overrides, where null inherits the base image. Snapshot resolution replaces only the head image, sharing unchanged body branches and preserving base geometry.
- Authored image values are filenames from `public/assets/bodies/`. Runtime references and image-set keys are canonical `/assets/bodies/...` paths. This supersedes ADR 005's authored-URL identity and character-field details. ADR 010's filename validation and fetch-time `baseUrl()` requirements remain unchanged.
- Parsing and game-state construction remain synchronous and perform no asset I/O. Initialization loads decoded assets into the game state's image set before creating game state. Bitmap data never enters body definitions or snapshots.
- Collect and deduplicate every configured body-part and skin image, including unselected skins. Fetch/decode failure for any required character URL rejects image-set creation with the failed URLs. This supersedes ADR 005's blanket resilience, silent character fallback, and no-ImageBitmap fallback promises. Optional punch masks and unrelated asset policies remain unchanged.
- Omitted artwork still selects the vector fallback. A failed configured image is not equivalent to omitted artwork. Headless callers may still construct game state with an empty image set without initiating I/O.

### Geometry And Rendering

- Validate supplied filenames before completeness selection. Any missing/blank required field returns exact default geometry with only its optional head image; ignore partial numeric geometry and limb images. Complete malformed numeric geometry is an authoring error, not a successfully loaded fallback.
- Assemble complete geometry from source-pixel dimensions, local pivots, and torso connections in the standing/right-facing rest pose. Measure the union of full rectangles without posing or alpha scanning; uniformly scale all coordinates to `DEFAULT_BODY_HEIGHT`, currently `MAP_TILE_SIZE * 0.4`. No independent axis/part scaling or runtime height clamp.
- Raster heads paint and measure in their exact part rectangles. ADR 020's width-driven aspect-preserving fit remains only for vector-body heads. Skin images retain base geometry and can therefore distort; skin-specific geometry is not supported.
- Raster connections are used exactly as authored before whole-pose left-facing reflection. Vector bodies retain their legacy right-facing torso-attachment correction, paint order, geometry, and hand ownership. This compatibility is intentional, not a migration bridge to delete.
- Raster `farArm` and `nearArm` are fixed depth roles, not anatomical labels. The far arm remains behind the torso and the near arm in front under either facing. Leg names are unchanged. No old arm-name aliases remain.
- Gameplay hands remain character-relative: right-facing uses far arm for left hand and near arm for right hand; left-facing reverses this mapping. Vector ownership remains unchanged. Raster hand points provisionally use `[width * 0.75, height]`; accurate authored grips are deferred.

## Consequences

The original separation of definitions, poses, projection, painting, and runtime asset ownership remains intact. Grounding, stacking, speech anchors, head rotation, held-item layering, portraits, and obscured silhouettes continue through their existing paths. Diagnostics can be enabled with the default-off developer flag; they are not required for authoring or runtime behavior.

Mixed-part authoring, articulated joints, per-skin geometry, accurate authored hand points, and removal/redesign of vector rendering are outside this decision.