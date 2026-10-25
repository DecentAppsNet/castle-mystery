# ADR 020: Character Body Parts

## Status

Accepted

## Decision

Replace stick geometry with six parts resolved through a torso-root hierarchy. Pure definition, transform, pose, and projection logic lives in `src/game/characterBody`; canvas painters consume its resolved geometry.

- Definitions contain readonly game-unit dimensions, local pivots, parent-local connection points, and arm-local hand points. Character duplication preserves the original definition reference. Posing neither mutates nor clones the tree; resolved poses are temporary, not timeline or save data.
- Local Y points downward. Attachments compose as `parent * translate(connection) * localRotation * translate(-pivot)`, keeping each child pivot on its resolved parent connection. Descendants inherit parent transforms.
- Posture is resolved before whole-pose facing reflection. Sitting/kneeling rotate rigid legs forward/backward; laying uses a negative quarter-turn, with the right-facing head to screen-left. This is the accepted visual convention, replacing the handoff's opposite laying direction.
- Vector-placeholder facing is not solely a mirror: right-facing poses also reflect torso-local shoulder/hip connection X coordinates across the torso width. This keeps near/far placement consistent with paint order without exchanging anatomical identities, assets, or hand ownership.
- Raster bodies use authored right-facing connections directly, then reflect the whole pose for left-facing. A non-null torso image identifies raster anatomy; this distinction does not depend on bitmap loading. The vector-only correction is retained as temporary compatibility, not a convention for raster authoring. Removing it by changing default connections cannot preserve both existing vector facings. No placeholder redesign or anatomical label exchange is intended.
- Standing grounds the feet. Sitting, kneeling, and laying ground the torso's lower transformed edge, independently of protruding children or overall bounds.
- Project the stack-supported display anchor once, including room depth/panel offset. Apply local view scale and the existing pixel sway once to the shared layout. Bounds, hands, head summaries, and transfer anatomy derive from those same transforms.
- Transfer centers remain torso-centered; speech/thought anchors use head-center X and the layout's top edge. Anatomy is available before effect dispatch. Speech rotation is a draw-time neck-pivot adjustment, not a change to interaction bounds.
- Head painting and bounds share one width-driven, aspect-preserving image fit centered in the logical head slot. The fitted image may extend beyond the slot height. Missing images retain the circular fallback.

## Paint Order

Hierarchy traversal does not determine occlusion. Back-to-front order is:

- Right-facing: left arm, left leg, right leg, torso, head, right arm.
- Left-facing: right arm, right leg, left leg, torso, head, left arm.

Held items retain their before/after-body layering, resolved hand anchors, existing offsets, and upright artwork. Head overrides preserve their visual rotation direction under reflection.

## Scope

The legacy stick layout is removed. This establishes placeholder vector bodies and existing face artwork, not raster body authoring, articulated joints, new limb effects, or independent part scaling. Existing stacking and effect-observability decisions remain unchanged.