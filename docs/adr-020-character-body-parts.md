# ADR 020: Character Body Parts

## Status

Accepted

Raster authoring, exact raster-head fitting, required-asset errors, and retained vector compatibility are specified by [ADR 021](adr-021-raster-character-assets.md). It extends this decision without changing its hierarchy/projection boundaries.

## Decision

Replace stick geometry with six physical parts and two attachment-only hand nodes resolved through a torso-root hierarchy. Pure definition, transform, pose, and projection logic lives in `src/game/characterBody`; canvas painters consume its resolved geometry.

- Definitions contain readonly game-unit dimensions, local pivots, and parent-local connection points. `nearHand` and `farHand` are attachment-only children of their respective arms, replacing `BodyPart.handPoint`. Their origins are item-center attachments; they have no artwork or physical extent and do not contribute to bounds, source-body height, grounding, or stacking. Character duplication preserves the original definition reference. Posing neither mutates nor clones the tree; resolved poses are temporary, not timeline or save data.
- Local Y points downward. Attachments compose as `parent * translate(connection) * localRotation * translate(-pivot)`, keeping each child pivot on its resolved parent connection. Descendants inherit parent transforms.
- Posture is resolved before whole-pose facing reflection. Sitting/kneeling rotate rigid legs forward/backward; laying uses a negative quarter-turn, with the right-facing head to screen-left. This is the accepted visual convention, replacing the handoff's opposite laying direction.
- Arm parts are named `farArm` and `nearArm` for their fixed raster depth roles, not anatomical sides. Leg names and gameplay's character-relative left/right hand ownership are unchanged. Right-facing raster bodies map the far arm to the left hand and the near arm to the right hand; left-facing reverses that mapping.
- Vector-placeholder facing is not solely a mirror: right-facing poses also reflect torso-local shoulder/hip connection X coordinates across the torso width. Vector arms retain legacy hand ownership (`farArm` to left hand, `nearArm` to right hand) and facing-dependent paint order for compatibility.
- Raster bodies use authored right-facing connections directly, then reflect the whole pose for left-facing. A non-null torso image identifies raster anatomy; this distinction does not depend on bitmap loading. The vector-only correction is retained as temporary compatibility, not a convention for raster authoring. Removing it by changing default connections cannot preserve both existing vector facings. No placeholder redesign is intended.
- Standing grounds the feet. Sitting, kneeling, and laying ground the torso's lower transformed edge, independently of protruding children or overall bounds.
- Project the stack-supported display anchor once, including room depth/panel offset. Apply local view scale and the existing pixel sway once to the shared base layout. Resolve aggregated numeric anatomy deltas parent-first into a separate visual layout, then apply deferred hand displacement. Body painting, held artwork, and held-item bubbles share completed visual geometry; base bounds, grounding, stacking, and unrelated anchors remain unchanged.
- Give targets and inventory transfer centers remain torso-centered; hand take/drop room endpoints use image-rectangle centers. Speech/thought anchors use base head-center X and the layout's top edge. Anatomy is resolved before effect drawing. Speech rotation is a visual neck-pivot adjustment, not a change to interaction bounds.
- Head painting and bounds share one width-driven, aspect-preserving image fit for vector bodies; it may extend beyond the logical head slot. Raster bodies use the exact head part rectangle instead. Omitted head artwork retains the circular fallback; configured image failures are loading errors under ADR 021.

## Paint Order

Hierarchy traversal does not determine occlusion. Back-to-front order is:

- Right-facing: far arm, left leg, right leg, torso, head, near arm.
- Raster left-facing: far arm, right leg, left leg, torso, head, near arm.
- Vector left-facing (legacy compatibility): near arm, right leg, left leg, torso, head, far arm.

Held items retain their before/after-body layering and gameplay hand ownership. The center of the full image rectangle attaches to the resolved hand node, replacing the downward screen offset and upright artwork. Artwork inherits arm and ancestor orientation/reflection, including current-frame animation. Item sizing remains independent of body-source scaling; camera projection is applied once, including nonuniform view scales. Bubbles use the union of transformed image corners. Head overrides preserve their visual rotation direction under reflection.

## Scope

The legacy stick layout is removed. This decision established placeholder vector bodies and head artwork; ADR 021 adds raster body authoring. [ADR 022](adr-022-walking-leg-effects.md) extends it with anatomy effects and their composition rules. Articulated joints, independent part scaling, and per-item translation/rotation authoring or fixed/inherited rotation modes remain outside scope. Existing stacking and effect-observability decisions remain unchanged.