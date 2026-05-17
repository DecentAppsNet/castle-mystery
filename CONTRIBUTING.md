# Contributing

## Development Setup

1. Install dependencies with `npm install`.
2. Start the dev server with `npm run dev`.
3. Run tests with `npm test`.

## Tests

This project uses two test categories.

### Unit tests

Unit tests verify the contract of a module. They may mock dependency modules when useful, but should usually exercise real code paths.

Guidelines:

* Prefer not to mock. Only mock file I/O, network I/O, operating-system functions, or other behavior that is non-deterministic or leaves persistent side effects.
* Only test exported functions.
* Put imports at the top of the file.
* Place unit tests at `.../moduleFolder/tests/moduleName.test.ts`, where `moduleFolder` is the folder containing the module under test, and `moduleName` matches the module under test.
* Use `describe('module name')` at the top level.
* Nest `describe('functionName()')` blocks under the top-level module block.
* Keep each test focused on one behavior.
* Order tests from simpler and more fundamental behavior to more complex behavior.

### Integration tests

Integration tests verify a collection of behaviors around a feature. They should use multiple modules together and should not focus on the behavior of just one module.

Guidelines:

* Prefer not to mock. Only mock file I/O, network I/O, operating-system functions, or other behavior that is non-deterministic or leaves persistent side effects.
* Place integration tests under `src/functionalityName/integration-tests`, where `functionalityName` is the folder most closely associated with the feature under test.
* Use `describe()` blocks to group by testing concept, such as `wandering integration`.
* Arbitrary nested grouping beneath that is fine when it improves readability.

### Determinism

* For tests that depend on random number generation, use `setSeed()` so results are repeatable.

### Test Safety

* Do not add filesystem access to tests. Tests should not read or write files directly.
* Do not add shell commands or subprocess execution to tests.
* Do not add network calls to tests.
* AI agents and automated tools must follow the same rule: do not introduce filesystem, shell, subprocess, or network access into tests.
* If a test needs authored fixture content, import the fixture as text instead of loading it from the filesystem at runtime.
* Do not use multi-line assignments to a single test value. Put substantial authored test data in fixtures and import it instead.
* If code under test would otherwise perform filesystem, shell, subprocess, or network I/O, mock that boundary rather than performing the real operation.

# Fetching at Run-Time

* No fetches to services outside of the host domain are allowed.
* All calls to fetch() should call a URL that has been normalized with the baseUrl() function.
* The call to baseUrl() should be made near or on the same line as the call to fetch(). It should not be made outside the function that fetch() is called. (It is done this way so we can clearly see that every call to fetch() has baseUrl() normalization on its parameter.)
* Any alternative ways of performing network I/O other than calling the fetch() function should not be used.

## Function Organization

* Function definitions should be sequenced in call order so that if function A calls function B, function B appears earlier in the file than function A.
* If that ordering is impossible because of cyclical calls, the functions should be refactored to remove the cycle. Self-recursive functions are allowed.
* Don't keep unused functions in the code.
* Functions should only be exported if used outside the module they are declared in.
* Private, unexported functions are prefixed with `_`.

## ID Normalization

* Any variable whose name includes `Id` may only be assigned a normalized ID value or `null`.
* Raw authored or user-provided text should not be stored in a variable whose name includes `Id`. Normalize it first, or keep it in a variable named `...Text`, `...Name`, or `...Ref` until normalization happens.
* When code reads a non-null value from a variable whose name includes `Id`, it may assume the value is already normalized.
* Code must not redundantly call `normalizeId()` or `normalizeOptionalId()` on a non-null `...Id` variable.
* If a code path wants a debug guard for that invariant, use an `assert()`-based check instead of re-normalizing the `...Id` variable.
* Use the normalization utilities in `src/game/idUtil.ts` when converting raw text into normalized IDs.

## CSS

* `vh` should be used as the default unit for fixed lengths and dimensions, even widths. ("vw" can be used if the measurement truly is meant to be tied to viewport width.) The use of "vh" is less about tying sizes to viewport height, and more about finding a general size for scaling that keeps layout reasonably constant in a non-scrolling web app. Reusing VH for width tends to preserve intended aspect ratios.
* `rem` should be used for blocks of text of sentence or paragraph length. `vh` should still be used for smaller text such as labels or button captions.
* `px` should not be used unless there is a strong case that a non-scaling pixel length is appropriate for layout.
* `!important` should not be used unless there is a strong case to be made for it.

## Using RegEx

* All RegExs should be encapsulated in a function whose name describes what the RegEx does.
* Regex function names should be fairly complete self-descriptions, for example `findWhiteSpaceEnclosedNumber()` rather than `findNumber()`.
* If the function name would become excessively long, or still would not describe the full logic clearly, prefer non-regex code and optionally call smaller regex helper functions inside that logic.
* All regex functions need unit tests.
* Prefer general-purpose regex helper functions where possible and put them in `src/common/regExUtil.ts`.
* When use-case-specific logic is needed, prefer a non-regex function in the feature module that composes shared regex helpers from `src/common/regExUtil.ts`.

## Achieving Code Coverage

* Coverage should be improved with contract-based tests rather than tests written around implementation branches.
* If uncovered code has no good contract-based path in expected use, treat that as a design smell and consider simplifying or refactoring the code.
* If uncovered code only guards an expected condition that should always be true in normal use, prefer replacing it with an assertion.
* Remove code that is not needed for expected use.
* Some code is low value for inclusion in unit and integration tests. In this project, that generally includes `.tsx` files and modules whose main purpose is drawing or rendering.
* Low-value files may be excluded from coverage either with an in-source coverage ignore comment or with project-level coverage configuration. Prefer project configuration when excluding a broad category such as all `.tsx` files.
* For file-level exclusion with Vitest's V8 coverage, place a comment such as `/* v8 ignore file -- @preserve */` at the top of the file.
* For smaller in-file exclusions with Vitest's V8 coverage, use comments such as `/* v8 ignore next -- @preserve */` or a `/* v8 ignore start -- @preserve */` / `/* v8 ignore stop -- @preserve */` pair.
* When using an in-source coverage ignore comment, add a short explanation of why the code is being excluded.
* If logic can be refactored out of a low-value file into a testable module without making the original file harder to understand, do that. The low-value file can then remain excluded from coverage, while the extracted logic should still be covered by tests.
