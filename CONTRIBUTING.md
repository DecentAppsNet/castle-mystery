# Contributing

## Development Setup

1. Install dependencies with `npm install`.
2. Start the dev server with `npm run dev`.
3. Run tests with `npm test`.

# Refactoring

## Module Summary Comments

* Every eligible module should have a concise comment at the top that has the following:
  * one-sentence description of scope of functionality the module includes
  * This statement `If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes.`
* An "eligible" module is a Typescript module that is not: a test file, a .tsx file, a file inside a `types` folder, or a type-focused file whose primary purpose is declaring types, unions, or enum-like value sets.
* In particular, modules inside `types` folders and subfolders such as `src/game/types/`, `src/game/types/itineraryEvents/` are not eligible for module summary comments, even if they also include small helpers such as `duplicate*()` or `createDefault*()`.
* Here is an example of a module summary comment:

```Javascript
/* This module groups room-focused drawing helpers, including room shells, exits, and in-room contents. 
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */
```

## Refactoring Large Modules

* AI agent instructions: If a module contains more than 500 lines of code, ask the user if they want to refactor that module. You don't need to interrupt a running task - just ask at the next graceful opportunity, e.g., at the end of completing a request.
* When refactoring a large module, look for an optimal set of sub-modules and propose to the user. 
  * A good sub-module will have a name that easily describes its scope, e.g. "levelIinteraryLoader". If it's difficult for a single module name to describe the scope, that's a sign that scope is not good for grouping.
  * A good sub-module will encapsulate functionality as private functions within the module, so that it becomes easier to think about the module in terms of its exported functions.
  * If there are a number of modules that could be usefully encapsulated inside of a folder, propose this in your plan. For example, say `roomDrawUtil.ts` is the exclusive caller of a set of modules like `roomRoofDrawUtil.ts` and `roomPanelDrawUtil.ts`. This set of modules could be moved to a new `/src/game/drawing/rooms/` folder.
* Get agreement from the user before implementing the refactor.
* All created sub-modules should contain the module summary comment.
* The module from which sub-modules were created should have its module summary comment updated.

# Testing

This project uses two test categories.

## Unit Tests

Unit tests verify the contract of a module. They may mock dependency modules when useful, but should usually exercise real code paths.

Guidelines:

* Prefer not to mock. Only mock file I/O, network I/O, operating-system functions, or other behavior that is non-deterministic or leaves persistent side effects.
* Do not add unit tests for drawing or rendering modules. Their results are visual, contract-based tests are usually not practical, and implementation-coupled tests are low value.
* If a drawing module depends on non-visual logic that would be valuable to test, refactor that logic into a separate non-drawing module and test that module instead.
* Only test exported functions.
* Put imports at the top of the file.
* Place unit tests at `.../moduleFolder/__tests__/moduleName.test.ts`, where `moduleFolder` is the folder containing the module under test, and `moduleName` matches the module under test.
* Use `describe('module name')` at the top level.
* Nest `describe('functionName()')` blocks under the top-level module block.
* Keep each test focused on one behavior.
* Order tests from simpler and more fundamental behavior to more complex behavior.

## Integration Tests

Integration tests verify a collection of behaviors around a feature. They should use multiple modules together and should not focus on the behavior of just one module.

Guidelines:

* Prefer not to mock. Only mock file I/O, network I/O, operating-system functions, or other behavior that is non-deterministic or leaves persistent side effects.
* Place integration tests under `src/functionalityName/integration-tests`, where `functionalityName` is the folder most closely associated with the feature under test.
* Use `describe()` blocks to group by testing concept, such as `wandering integration`.
* Arbitrary nested grouping beneath that is fine when it improves readability.

## Determinism

* For tests that depend on random number generation, use `setSeed()` so results are repeatable.

## Test Safety

* Do not add filesystem access to tests. Tests should not read or write files directly.
* Do not add shell commands or subprocess execution to tests.
* Do not add network calls to tests.
* AI agents and automated tools must follow the same rule: do not introduce filesystem, shell, subprocess, or network access into tests.
* AI agents should not put generated code into shell execution requests. If temporary generated test code is needed during development, create a diagnostic unit test under `/tempTests` instead.
* Diagnostic tests under `/tempTests` do not need to follow the usual unit-test placement and structure rules, but they must still follow the filesystem, shell, subprocess, and network safety rules above.
* Delete diagnostic tests when they are no longer needed. If the same test keeps proving useful, replace it with a permanent test that follows the normal project test rules.
* If a test needs authored fixture content, import the fixture as text instead of loading it from the filesystem at runtime.
* Do not use multi-line assignments to a single test value. Put substantial authored test data in fixtures and import it instead.
* If code under test would otherwise perform filesystem, shell, subprocess, or network I/O, mock that boundary rather than performing the real operation.

## Code Coverage

* Coverage should be improved with contract-based tests rather than tests written around implementation branches.
* If uncovered code has no good contract-based path in expected use, treat that as a design smell and consider simplifying or refactoring the code.
* If uncovered code only guards an expected condition that should always be true in normal use, prefer replacing it with an assertion.
* Remove code that is not needed for expected use.

### Low-Test-Value Modules

Low-test-value modules are modules matching one or more of these criteria:

* The testable contract is visual in nature, such as UI elements or canvas drawing.
* The module is primarily glue code that integrates calls to other modules that are more properly testable elsewhere.
* All files within `interactions` folders are considered low-test-value glue code.

Guidelines:

* Low-test-value modules should be ignored from code coverage.
* In this project, low-test-value modules commonly include `.tsx` files and modules whose main purpose is drawing or rendering.
* Do not add unit tests for drawing or rendering modules. Confirm those results with manual visual testing instead.
* If a drawing or rendering module contains logic with a meaningful non-visual contract, extract that logic into a separate module and test the extracted module instead of the drawing module.
* Low-test-value files may be excluded from coverage either with an in-source coverage ignore comment or with project-level coverage configuration. Prefer project configuration when excluding a broad category such as all `.tsx` files.
* For file-level exclusion with Vitest's V8 coverage, place a comment such as `/* v8 ignore file -- @preserve */` at the top of the file.
* For smaller in-file exclusions with Vitest's V8 coverage, use comments such as `/* v8 ignore next -- @preserve */` or a `/* v8 ignore start -- @preserve */` / `/* v8 ignore stop -- @preserve */` pair.
* When using an in-source coverage ignore comment, add a short explanation of why the code is being excluded.
* If a module contains a mix of low-test-value code and other code, split it into separate modules when practical so the low-test-value module can be ignored from coverage.
* If splitting a mixed module is impractical, put the low-test-value code into a designated coverage-ignore section within the module.
* If logic can be refactored out of a low-test-value file into a testable module without making the original file harder to understand, do that. The low-test-value file can then remain excluded from coverage, while the extracted logic should still be covered by tests.

# Assertions

* Assertions are for debug-only invariant checking: conditions that should always be true if the code is valid.
* Use assertions to catch debug errors that should be investigated and fixed, not to handle expected error conditions.
* Do not use assertions for normal validation of user input, authored content, network responses, or other failure modes that are expected to happen sometimes and should produce a real error path.
* Code inside an assertion must never modify state or produce side effects. Assertion expressions and helper functions should be pure checks only.
* Write assertion-related code with the assumption that assertions will compile out of production builds later. Do not rely on assertion code to preserve behavior needed at runtime.
* Do not use the verb `assert` in helper-function names. Prefer names that describe the predicate being checked, such as `areItineraryEventsInOrder()`.
* Import assertion functions from `decent-portal`.

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
