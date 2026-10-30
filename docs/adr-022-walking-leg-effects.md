# ADR 022: Walking Leg Effects

## Status

Accepted. Extends [ADR 020](adr-020-character-body-parts.md) without changing its definition, pose, projection, or grounding boundaries.

## Decision

### Visual Overrides Default To Relative Resolved-Pose Offsets

Relative offsets to each frame's freshly resolved pose are the default for body-part effects. A zero offset preserves that pose. This is not a ban on future absolute transforms: an absolute variant requires a justified use case and must include `absolute` in its name. No absolute variant is introduced here.

Do not accumulate offsets across frames or mutate body definitions, grounding, or interaction geometry. Effects remain deterministic under seeking, repeated evaluation, and pause. This lets effects coexist with posture changes without becoming another owner of character layout.

### Viewer-Relative Arm Targets

`viewerFrontArm` and `viewerBackArm` identify visual depth roles, not concrete `PartKind` identities. The shared body resolver derives them from existing paint order for vector/raster bodies and facing. Both effect geometry and override application use that resolver. Existing `nearArm`/`farArm` overrides still target exact concrete parts; body definitions, paint order, asset names, and gameplay hand ownership are unchanged.

### Pointing Snapshot And Factory Boundary

Following [ADR 015](adr-015-effect-data-and-calculation-boundaries.md), pointing resolves interpolated world state after all activities have been scheduled. Accepted activities serve as pending requests; no point-specific payload is added to `Effect` or shared draw context. Availability and held-item ownership are determined at pointing start, including later-authored target activities and final same-timestamp edits under existing ordering rules.

The effect factory uses pure pose and stack-layout geometry in game units to calculate a fixed relative angle at level load. It uses the viewer-front arm's pivot/local downward axis, a character's head center, a stacked room item's center, or a held item's holder torso center. Coincident targets return an invalid result for line-located author errors. Runtime handlers use captured angle/timing and timeline time, without target tracking, timeline reconstruction, or mutable animation state.

Aiming excludes depth projection, camera scaling, visual sway, and artwork/bend compensation. Subject-held item anchors intentionally remain unchanged, so carried items do not follow the animated arm. Neither this approximation nor holder-centroid targeting changes shared hand geometry.