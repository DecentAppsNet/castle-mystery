# ADR 024: Single-Category Conclusion Answers

## Status

Accepted

## Decision

- Build effective answer categories once per level. Authored lists are literal replacements, including built-ins. Trimmed, lowercase answer text is unique within authored lists and across effective categories, even unused ones. Generated lists deduplicate normalized titles deterministically.
- Every blank resolves to exactly one category and uses its full ordered display options. Unknown, empty, ambiguous, or mixed-category alternatives are authoring errors; no fallback or union is synthesized. Generated identities use the effective character category and must retain every required title.
- Within a conclusion, acceptable-answer sets must be disjoint or identical after normalization. Identical sets support interchangeable blanks only up to their distinct-answer capacity. Partial intersections and repeated singletons are rejected; general overlapping-set matching is not supported.
- Runtime correctness rejects repeated normalized selections. Completed-save restoration deterministically chooses distinct correct answers; it need not reproduce the claimed permutation. Unfinished selections and the save schema are unchanged.
- Answer sets are immutable metadata shared by same-category blanks within a conclusion. Their IDs equal their normalized category IDs and are local, not global interning keys. Blank indexes and selections remain independent.
- Styles depend only on category: characters 0, items 1, rooms 2, custom categories 3+ in first-appearance order. Pieces and slots consume one page lookup. Inventory emits each category once per conclusion page, retaining ordered options and fresh mutable pieces.

## Consequences

Invalid authoring fails with contextual corrective errors instead of being silently merged or repaired. Repeated narrative references should use literal text or pronouns rather than additional required blanks. Separate conclusions may reuse answers.

Unchanged ordered options retain their saved index meanings. Intentionally rewritten options or blanks may invalidate existing index-based saves; this decision does not add a save migration. Cross-level piece ownership collisions, selection controls, drag/drop, layout, and palette redesign remain out of scope.