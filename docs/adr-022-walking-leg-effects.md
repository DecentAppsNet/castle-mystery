# ADR 022: Walking Leg Effects

## Status

Accepted. Extends [ADR 020](adr-020-character-body-parts.md) without changing its definition, pose, projection, or grounding boundaries.

## Decision

### Visual Overrides Default To Relative Resolved-Pose Offsets

Relative offsets to each frame's freshly resolved pose are the default for body-part effects. A zero offset preserves that pose. This is not a ban on future absolute transforms: an absolute variant requires a justified use case and must include `absolute` in its name. No absolute variant is introduced here. If we begin using absolute transforms, it may create a need to guarantee a specific ordering of how transforms are applied, since relative transforms provide consistency in different orderings, e.g., (4 + 3 === 3 + 4).

Do not accumulate offsets across frames or mutate body definitions, grounding, or interaction geometry. Effects remain deterministic under seeking, repeated evaluation, and pause. This lets effects coexist with posture changes without becoming another owner of character layout.

### Additive Anatomy Composition

Walking, pointing, speaking, thinking, and hand-based take/give/drop contribute through the separate canvas-free anatomy handler described in ADR 015. Draw handlers return `void`; no new `EffectDrawCall` stage is introduced. Inventory transfers and text rendering remain drawing responsibilities.

Resolve viewer-relative aliases to concrete parts before aggregation. Sum compatible rotation angles about the attached pivot and translations within their declared fixed frame, rather than selecting the first contribution or multiplying matrices in handler order. Canvas-Y leg offsets retain their logical-height projection; numeric hand translations use canvas X/Y axes. Zero is identity. Resolve parents before children so hands inherit animated arm transforms, preserving existing head reflection and leg conventions. Drawing applies no second copy of these deltas.

### Deferred Hand Displacement

A narrow data variant targets `nearHand` or `farHand` with a canvas endpoint `D` and weight. Resolve its reference `H` after ancestor and ordinary numeric deltas, but before any deferred displacement. Each contribution computes `weight * (D - H)` from that same reference; sum the vectors and apply once. This is additive displacement, not an absolute transform replacement. It changes position without changing inherited orientation. Arbitrary final-node references and deferred callbacks are not supported.

Drop/give use progress as weight; take uses `1 - progress`. Hand take/drop use room image centers, while give targets the recipient's base torso center. Preserve timing, ownership, inventory behavior, and room layout semantics. The resolver performs this calculation without a second handler invocation or feedback from an already shifted hand.

### Viewer-Relative Arm Targets

`viewerFrontArm` and `viewerBackArm` identify visual depth roles, not concrete `PartKind` identities. The shared body resolver derives them from existing paint order for vector/raster bodies and facing. Both effect geometry and override application use that resolver. Existing `nearArm`/`farArm` overrides still target exact concrete parts; body definitions, paint order, asset names, and gameplay hand ownership are unchanged.

### Pointing Snapshot And Factory Boundary

Following [ADR 015](adr-015-effect-data-and-calculation-boundaries.md), pointing resolves interpolated world state after all activities have been scheduled. Accepted activities serve as pending requests; no point-specific payload is added to `Effect` or shared draw context. Availability and held-item ownership are determined at pointing start, including later-authored target activities and final same-timestamp edits under existing ordering rules.

The effect factory uses pure pose and stack-layout geometry in game units to calculate a fixed relative angle at level load. It uses the viewer-front arm's pivot/local downward axis, a character's head center, a stacked room item's center, or a held item's holder torso center. Coincident targets return an invalid result for line-located author errors. Runtime handlers use captured angle/timing and timeline time, without target tracking, timeline reconstruction, or mutable animation state.

Aiming excludes depth projection, camera scaling, visual sway, and artwork/bend compensation. A subject-held item follows its animated hand node, including inherited orientation and reflection. This attachment behavior does not change snapshot aiming or holder-centroid targeting when pointing at another character's held item.