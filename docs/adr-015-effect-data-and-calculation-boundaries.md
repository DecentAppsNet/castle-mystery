# ADR 015: Effect Data and Calculation Boundaries

## Status

Accepted

## Context

An effect connects two phases with very different concerns. Level loading schedules an activity and creates its effects once per level load. Rendering may invoke each effect handler on every animation frame and must keep all timeline lookup, game rendering, and effect work within a sub-millisecond budget to sustain 60 FPS.

The timeline is deliberately optimized for fast state-at-time retrieval by storing redundant state in keyframes. This replaced an architecture that replayed all preceding events to reconstruct state for a requested time. Effects must preserve that performance model rather than introduce repeated reconstruction during drawing.

`Effect` is intentionally a small, general, non-discriminated type. Its fields apply to almost every effect, while effect-specific data can reach handlers through values captured by `create*Effect()` or through the draw-stage-specific `EffectDrawCall` union. Adding a field to `Effect` therefore imposes a high design and maintenance cost: the field becomes part of the common effect contract even when most effect kinds do not use it.

Choosing where to calculate effect data involves competing goals. Level loading should not perform presentation layout, but moving stable work out of per-frame handlers can substantially reduce drawing cost. Shared draw-stage context can avoid repeated calculations, but effect-specific additions can couple general drawing infrastructure to one effect. No fixed rule resolves every case.

## Decision

### 1. Keep `Effect` small and broadly applicable

Extending `Effect` has a deliberately high barrier. A new member belongs there only when it has coherent meaning for all or most effect kinds and cannot be represented more appropriately by curried effect-specific data or draw-stage context.

Effect-specific payloads must not turn `Effect` into a discriminated union of presentation models. `kind`, timing, and handler remain the common effect contract unless a separate architectural decision establishes a broadly shared need.

### 2. Level loading supplies world and scheduling inputs

Activity scheduling passes the stable values needed to generate an effect into its `create*Effect()` function. These may include world positions, entity IDs, insertion indices, timing, or immutable model objects.

Level loading does not calculate canvas coordinates, sprite geometry, scaling-dependent dimensions, current-frame anatomy, or other presentation layout. Such values depend on drawing state, belong to presentation code, or may change while the game is running.

### 3. Effect factories may curry stable effect-specific calculations

A `create*Effect()` function may perform presentation-level calculations that are:

- specific to that effect
- stable for the effect's lifetime
- derivable from its creation inputs without current-frame drawing state
- beneficial to calculate once per level load rather than once per frame

The factory captures the result in its handler closure. It should not duplicate a calculation that the drawing pipeline already performs for the same frame or pass. If the needed value naturally exists in shared draw context, the handler consumes that value instead.

Currying is also appropriate for unchanged creation inputs. When an input type provides an immutable or read-only guarantee, capture and reuse that instance rather than defensively duplicating it. Duplicate only when ownership, mutation, or snapshot semantics require an independent value.

### 4. Extend `EffectDrawCall` only with shared draw-stage information

`EffectDrawCall` may be carefully extended with presentation information available at a particular drawing stage. Prefer members that provide the same useful information to multiple effects running at that stage over values tailored to one effect.

New draw-call data should, where practical:

- be calculated once at a shared animation-frame or draw-pass boundary
- be reused by all relevant effects in that stage
- reflect current presentation state that cannot be safely fixed at level load
- remain scoped to the narrowest applicable discriminated-union branch
- avoid duplicating work already performed elsewhere in the same frame

An effect-specific need alone is not sufficient reason to expand `EffectDrawCall`. First consider currying stable data, reusing existing draw-stage calculations, or introducing a shared presentation abstraction that has independent value to multiple effects.

### 5. Resolve conflicting goals case by case

These principles establish boundaries, not an exhaustive placement algorithm. A requirement may involve stable data, current-frame state, shared layout, and expensive calculation simultaneously. When the choices conflict or would create significant coupling, document the tradeoff and perform further design work rather than forcing the calculation into one layer solely to satisfy a guideline in this ADR.

## Rationale

Calculating stable work during effect creation takes advantage of a once-per-level-load path and keeps repeated handler work small. Keeping presentation layout out of level loading preserves the separation between authored world state and rendering. Sharing current-frame calculations through draw-stage context prevents every effect from independently deriving the same information.

A high barrier for changing `Effect` protects its role as a compact common scheduling and rendering record. Effect factories and `EffectDrawCall` provide narrower channels whose lifetimes and responsibilities better match effect-specific and current-frame data respectively.

Reusing immutable instances avoids allocations that provide no isolation benefit. Combined with keyframe-based timeline lookup and once-per-frame shared presentation calculations, this supports the runtime performance target without moving mutable display state into the timeline.

## Consequences

### Positive

- Common effect data remains small and understandable.
- Level loading remains free of canvas and current-frame layout concerns.
- Stable effect-specific work can be paid once per level load.
- Shared per-frame presentation work can serve multiple effects without repeated calculation.
- Immutable data can be safely reused without unnecessary duplication.
- Effects preserve the timeline's fast state-at-time architecture.

### Negative

- Effect handlers may rely on closures whose captured data is not visible in the `Effect` shape.
- Deciding whether data is stable, shared, or presentation-specific requires judgment.
- Extending shared draw context may require coordinated changes across drawing stages and effects.
- Some cases need a separate design decision because minimizing per-frame work conflicts with clean layering.

## Implementation Notes

1. Pass scheduling/world inputs from activity schedulers to narrowly named `create*Effect()` parameters.
2. Keep scaling-dependent and current-frame calculations in drawing unless a shared presentation pass already produces them.
3. Before adding handler work, check whether the same calculation is already available in `EffectDrawCall` or its nested contexts.
4. Before extending `EffectDrawCall`, identify which effects can reuse the value and where it can be collected once per frame or pass.
5. Treat read-only type guarantees as permission to capture the same instance; do not clone by habit.
6. Do not reconstruct timeline state by replaying prior events inside effect handlers.
7. Profile or measure when a placement decision is motivated primarily by performance.

## Not Chosen

### Put every effect-specific value on `Effect`

Not chosen because most values apply to only one effect kind and would weaken the small common contract or require a broad discriminated presentation model.

### Perform all effect presentation calculations during level loading

Not chosen because canvas scaling, active-room state, anatomy, visibility, and other presentation inputs can change at runtime and do not belong in authored world or timeline state.

### Calculate all effect data inside every handler invocation

Not chosen because stable calculations would be repeated every frame and shared presentation calculations could be repeated independently by multiple effects.

### Add effect-tailored fields to `EffectDrawCall`

Not chosen as a default because it couples shared drawing infrastructure to individual effects and can turn the draw-stage union into another effect payload. Additions should represent reusable stage-level information.

### Replay events to derive state for effects

Not chosen because the timeline intentionally stores redundant keyframes to provide fast state-at-time retrieval. Reintroducing event replay in handlers would work against the runtime architecture and frame budget.
