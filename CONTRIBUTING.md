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

### Commands

* Run the full test suite with `npm test`.
* Run tests in watch mode with `npm run test:watch`.
* Run coverage with `npm run test:coverage`.

## Function Organization

* Function definitions should be sequenced in call order so that if function A calls function B, function B appears earlier in the file than function A.
* If that ordering is impossible because of cyclical calls, the functions should be refactored to remove the cycle. Self-recursive functions are allowed.
* Don't keep unused functions in the code.
* Functions should only be exported if used outside the module they are declared in.
* Private, unexported functions are prefixed with `_`.
