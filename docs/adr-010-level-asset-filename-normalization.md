# ADR 010: Level Asset Filename Normalization

## Status

Accepted

## Context

Level files currently author some HTTP-loaded asset references as URL-like strings.

That creates several problems:

- authored values can smuggle path traversal, query strings, fragments, or other unwanted URL structure into runtime asset references
- different authored spellings for the same asset can create multiple cache keys for what is conceptually one image
- some code paths treat authored values as filenames while others treat them as already-concatenated asset paths
- runtime fetch code becomes harder to reason about because the boundary between authored input and trusted asset location is unclear

The project already has a strict runtime fetching policy in [CONTRIBUTING.md](../CONTRIBUTING.md):

- all network I/O must use `fetch()`
- all `fetch()` URLs must be normalized with `baseUrl()` near the fetch call
- no fetches to services outside the host domain are allowed

We want authored level data to stay simple while ensuring that runtime asset loading only uses trusted host-local asset paths.

## Decision

Level-authored references for HTTP-loaded asset fields will use filenames, not arbitrary URLs.

### 1. Authored level fields for HTTP-loaded assets use filenames only

When a level field represents an HTTP-loaded asset, its authored value is a filename.

The field name determines the asset bucket.

Examples:

- `background=filename.png`
- `faceImage=filename.png`

Authors should not provide paths, query strings, fragments, protocol-relative URLs, or absolute URLs in these fields.

### 2. Level loading validates that authored asset values are already filenames

Level loading is responsible for validating authored asset values before they enter game data structures.

An authored value is valid only if it is already a filename-only token.

Level loading must reject any authored value that contains path or URL structure rather than trying to clean it up.

### 3. Level loading fails on the first indicator of non-filename structure

Filename validation is not a permissive cleanup step.

If level loading detects any sign that the authored value is not already a filename, it must fail with a helpful exception.

This includes authored values such as:

- relative paths
- absolute paths
- values containing query strings or fragments
- values containing directory separators
- any other value whose trusted filename form differs from what the author wrote

The purpose is to make invalid asset references visible at authoring time rather than silently rewriting them into a different value.

### 4. Asset paths are derived from trusted buckets, not authored path structure

The runtime asset URL is derived by concatenating the validated filename onto a fixed asset bucket implied by the field.

Examples:

- `background=sky.png` becomes `/assets/backgrounds/sky.png`
- `faceImage=queen.png` becomes `/assets/faces/queen.png`

The author controls the filename only.

The author does not control the directory, scheme, host, query string, or fragment of the resulting runtime path.

### 5. Stored asset references use the concatenated runtime form

When asset references are stored in `Level`, `GameState`, `Character`, solution parts, image caches, or other runtime data structures, they should use the concatenated trusted runtime path, not the raw authored filename.

For example, if a level authors `background=sky.png`, the stored value should be `/assets/backgrounds/sky.png`.

### 6. Ambiguous bucket resolution uses ordered candidate URLs outside level loading

Some authored asset fields may legitimately map to more than one allowed asset bucket.

When that happens, level loading should remain headless and should not perform network I/O to determine which candidate exists.

Instead, level loading may store an unresolved asset reference as an ordered list of candidate runtime paths.

The conceptual type for that unresolved form is:

- `type CandidateUrls = string[]`

Candidate URLs are ordered from most specific or preferred bucket to least preferred bucket.

Resolution of `CandidateUrls` into a single canonical runtime URL happens later, during runtime asset loading, by trying candidates in order and selecting the first successful result.

### 7. Canonical runtime URLs remain single-path identities after resolution

`CandidateUrls` is an unresolved load-time representation only.

After runtime asset resolution chooses a successful candidate, downstream runtime data should use that one resolved canonical runtime URL.

This means:

- `imageSet` keys should use the resolved canonical runtime URL
- `GameState` and other runtime structures should use the resolved canonical runtime URL
- unresolved `CandidateUrls` should not be treated as canonical asset IDs

### 8. Concatenated asset paths are the canonical identity for runtime asset lookup

The concatenated trusted runtime path is the canonical identifier for an asset at runtime.

This means:

- image-set keys should use the concatenated runtime path
- rendering lookups should use the concatenated runtime path
- duplicated authored filenames in different buckets remain distinct because their stored runtime paths differ

### 9. `baseUrl()` remains a fetch-time concern

Stored asset references should remain host-relative application paths such as `/assets/backgrounds/sky.png`.

They should not be pre-normalized with `baseUrl()` when stored in level or game data structures.

`baseUrl()` should continue to be applied only at the point of `fetch()` or equivalent immediate asset loading, near that network call, in accordance with [CONTRIBUTING.md](../CONTRIBUTING.md).

### 10. Asset reference validation happens at load boundaries and resolution happens at asset-loading boundaries

Authored asset text should be validated at the boundary where level data is loaded.

If a field maps unambiguously to one bucket, level loading should convert it directly to its canonical runtime path.

If a field maps to multiple allowed buckets, level loading should convert it to ordered `CandidateUrls` and defer final resolution until runtime asset loading.

After those boundaries, downstream code should work with either:

- canonical runtime paths, or
- explicitly unresolved `CandidateUrls`

Downstream code should not re-interpret the original authored text.

### 11. This rule applies to HTTP-loaded level assets broadly, not just current image fields

These principles are not specific to `background` and `faceImage` alone.

Any level-authored field whose value is used to load an HTTP asset should follow the same model unless an ADR explicitly makes a different decision:

- filename-only authoring
- validation at load time
- fixed bucket derivation by field semantics
- canonical stored runtime path when unambiguous
- ordered `CandidateUrls` when multiple allowed buckets must be tried later

## Rationale

This model creates a clear trust boundary.

Before level loading, asset references are authored text and are not trusted.

After level loading, asset references are either:

- canonical host-local asset paths derived from validated filenames and fixed buckets, or
- explicit ordered `CandidateUrls` for cases where multiple allowed buckets must be resolved later

After runtime asset resolution, asset references used as runtime identities are canonical host-local asset paths.

That separation has several advantages:

- it blocks authors from steering runtime loads to arbitrary host paths through asset fields
- it prevents silent aliasing between raw filenames and concatenated asset paths
- it gives runtime systems one stable key shape for caching and lookup
- it preserves headless level loading even when some fields need multi-bucket resolution
- it makes ambiguous-bucket fallback explicit in the data model instead of encoding multiple candidates into one fake URL string
- it makes invalid authored asset references fail early and visibly
- it preserves the existing fetch discipline where `baseUrl()` is applied only at network boundaries

## Consequences

### Positive

- authored asset fields become simpler and more predictable
- runtime asset lookups get stable, bucket-qualified IDs
- cache keys are less error-prone because they no longer depend on multiple authored path spellings
- security review is simpler because authored input cannot directly define fetchable paths
- load-time validation catches bad asset references before they leak into gameplay or rendering

### Negative

- existing level fixtures and authored content that currently use path-like values will need migration
- some tests that currently assert raw authored paths will need to assert canonical concatenated paths instead
- adding a new authored HTTP-loaded asset field now requires explicitly defining its bucket and validation behavior
- fields that support multi-bucket resolution now require an explicit unresolved representation until runtime asset loading resolves them
- silent cleanup of sloppy authoring is intentionally disallowed, so some previously tolerated values will become load errors

## Not Chosen

### Storing raw authored filenames in runtime data structures

Not chosen.

Reason:

- raw filenames are not unique across buckets
- downstream code would need bucket-specific reconstruction logic in multiple places
- cache keys would be less stable and more ambiguous

### Encoding multiple candidate URLs into one string value

Not chosen.

Reason:

- a delimited multi-candidate string is not actually a URL
- it blurs the distinction between unresolved references and canonical runtime asset IDs
- it forces parsing conventions into places that should only consume structured data
- an explicit `CandidateUrls` type is clearer and more general

### Silently sanitizing or cleaning invalid authored values and continuing

Not chosen.

Reason:

- it hides authoring errors
- it can make stored values differ from authored values without an explicit signal
- it weakens the trust boundary by treating malformed authored values as acceptable input

### Allowing authors to specify arbitrary host-relative asset paths

Not chosen.

Reason:

- it keeps too much path control in authored data
- it complicates reasoning about which folders a field is allowed to access
- it undermines the field-implied bucket model

### Prepending `baseUrl()` when storing asset references

Not chosen.

Reason:

- `baseUrl()` is environment-specific fetch normalization, not canonical asset identity
- storing base-path-expanded values would mix deployment concerns into domain data
- the project rule is to apply `baseUrl()` near `fetch()`, not during level parsing