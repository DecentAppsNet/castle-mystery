# ADR 022: Walking Leg Effects

## Status

Accepted. Extends [ADR 020](adr-020-character-body-parts.md) without changing its definition, pose, projection, or grounding boundaries.

## Decision

### Visual Overrides Are Relative To Resolved Poses

Apply body-part effects as relative offsets to each frame's freshly resolved pose. A zero offset preserves that pose. Do not accumulate offsets across frames or mutate body definitions, grounding, or interaction geometry. This lets effects coexist with posture changes without becoming another owner of character layout.