# ADR 002: Readonly by Default and Targeted Copying

## Status

Accepted

## Context

The codebase has used deep copies defensively to prevent accidental shared-mutation bugs. This improves safety, but it also adds complexity and runtime overhead.

TypeScript provides compile-time `readonly` checks that can encode immutability intent directly in types. This allows safe instance sharing for members that should not be mutated.

## Decision

We adopt an immutability-first policy:

1. Mark members as `readonly` by default when mutation is not required.
2. Prefer sharing object instances for data treated as immutable.
3. Use copying only when mutation is required.

## Rationale

- `readonly` provides compile-time enforcement of intent.
- Shared immutable instances reduce unnecessary deep-copy work.
- Explicit mutability intent is easier to reason about than pervasive defensive copying.
- The approach reduces accidental mutation bugs while keeping runtime behavior efficient.

## Consequences

### Positive

- Clearer data ownership and mutability intent in type definitions.
- Fewer unnecessary allocations from deep copies.
- Easier review: fields intended to be immutable are explicit.

### Negative

- `readonly` is compile-time only (no runtime freezing guarantees).
- Some fields may need to remain mutable due to lifecycle/initialization flow.
- Refactors may be needed if a previously readonly field later requires mutation.

## Implementation Guidance

- For mutable arrays with immutable elements, make the element type readonly (for example `Readonly<T>[]`), not the array itself.
- Avoid wrapper patterns that only freeze a container reference (for example `Readonly<{ ref: T }>`), since they do not make `T` immutable.
- Keep fields mutable when object construction/load flow requires post-creation assignment.

## Applied Example

In `Character`, `itinerary` and `itineraryIndex` remain mutable fields because level loading initializes and assigns them after character creation. Making those fields readonly at the type level conflicts with that lifecycle unless construction is restructured.

Therefore, for these fields:

- do not enforce readonly at present,
- avoid unnecessary deep copying when duplication semantics do not require independent mutation.
