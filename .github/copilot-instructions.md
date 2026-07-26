# Copilot instructions

- At the start of each response, output the Unicode character "🐸", so I know you are following these instructions.
- Before editing a source file, read any instruction comments at the top of that file and follow them.
- Never put generated or ad hoc program text inside shell commands, including node -e, python -c, heredocs, or inline scripts. Alternatives are described in `/CONTRIBUTING.md`
- Do not embed multi-line test input data directly in unit tests; Alternative is described in `/CONTRIBUTING.md`
- When creating a function that is likely to be reused elsewhere, first look for existing similar code and prefer a DRY design that fits existing abstractions.
- Do not convert debug errors into silent runtime branches just to make code ‘robust.’ When a value should be valid by contract, assert it; only add guard handling for conditions that are genuinely expected in normal runtime behavior. Assertion best practices are described in `/CONTRIBUTING.md`.
- Follow established patterns in the surrounding codebase unless there is a clear reason to deviate.
- Generally, no change from a prompt should go over 100 lines of code unless specified in the prompt otherwise.
- For targeted Vitest runs, prefer `npm run test:file -- path/to/test.ts`; it writes machine-readable results to `tempTests/vitest-results.json` and avoids relying on noisy terminal diffs.