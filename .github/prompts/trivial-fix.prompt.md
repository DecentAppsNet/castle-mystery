---
name: Trivial Fix
description: "Make small changes to fix broken tests or other bugs"
argument-hint: "Specify scope of files to check or leave blank for scope as full test suite"
agent: "agent"
---

# Overview

This prompt provides a quick way to fix shallow bugs that need little design or discussion.

"Line count" in this file refers to the combined count of added and deleted lines within any file.

If there are beneficial fixing actions in the scope that can't be made due to constraints, they should be described in the completion response.

## Constraints

* If there is no bug in a file within scope, give no further consideration, and make no modification, to that file.
* Don't make edits to files outside of scope.
* Files outside the scope that provide context for making edits to files in scope, may be read, but not modified.
* Only trivial fixes should be made according to the definition of "trivial" provided below.
* Don't make inferior fixes when a better change is available that can't be used due to constraints.

## Definition of Scope

* The scope defines what files will be considered for fixes and may be modified.
* If the user has specified a scope of files within their prompt, use that for scope, clarifying as needed.
* If the user hasn't specified of scope of files within their prompt, the default scope is all test files found recursively under the `/src/` folder. This scope does not include files imported by the test files.

## Definition of Trivial

* Trivial: The author's original intent of code is supported by the change.
* Trivial: The change is easy to understand to a skilled developer unfamiliar with the codebase.
* Non-trivial: Understanding or justifying the change requires substantial cross-referencing beyond the file being changed.
* Non-trivial: Changes for any individual fix in excess of 10 lines.
* Non-trivial: Changes to contracts of functions or tests.
* Non-trivial: Changes that conflict with ADRs.
* Non-trivial: Changes to an algorithm in a function.

## Definition of Bug

For this prompt, a "bug" means behavior that deviates from author's intent as evidenced by a failing test. Note that the failure could be the test or the code under test.

## Running Tests and Observing Results

For `npm run test:all` and `npm run test:file`, use the command exit code and concise terminal output to determine whether tests failed. Do not issue ad hoc commands to interpret test results.

## Completion response

Changes will be visible to user in the IDE - no need to restate them.

If no bugs were found in the scope according to test command output, respond only with "No bugs found in scope." This implies that no fixes were made either.

If any fixes within scope were prevented by constraints, concisely explain with one line per prevented fix.

If any irregularities or problems occurred that prevented normal operation, concisely explain.

If no output was made for any of the previous conditions, respond only with "Operation complete."