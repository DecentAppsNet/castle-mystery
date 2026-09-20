---
name: Conditional Debug
description: "Add a debugger statement to code that triggers under a specified condition"
argument-hint: "The condition that will trigger the debugger statement | 'remove'"
agent: "agent"
---

# Overview

Sometimes execution hits a point in code many times and it is impractical to set a breakpoint for debugging. This prompt injects 
temporary code that checks for a condition at run-time and executes a "debugger" statement when that condition is true.

The prompt can also be used to remove existing code injections that were added by this prompt.

## Interpreting Arguments

If the argument is simply "remove", issued like `/Conditional Debug remove`, then follow removal instructions, and don't attempt to inject new code.

Otherwise, the argument should specify the condition that will be detected to trigger a debugger statement within the code injection. It will be written in plain English. Here are some examples:

`/Conditional Debug the condition during scheduling that produces this output error "initialization.ts:35 adhoc.md:245:0: sam can't arrive at destination in "closet" room by 8:00:48. Need another 12 seconds."`

`/Conditional Debug inside this loop in the active file, but I want a break when the first coordinate at top of loop is outside of the containerRect value`

`/Conditional Debug as soon as a level file load fails due to an exception rather than a parsing error`

The user may or may not specify an exact location or condition. You may need to determine the file to inject inside of and what code will successfully detect the specified condition.

If the argument is left blank or there is ambiguity in how you should proceed, ask the user for clarification and take no further actions until the user intent is clear and you are able to follow it.

## Removal Instructions

1. Search for all occurrences in project source code of `debugger; // Conditional Debug Injection`.
2. Delete each single-line injection found matching the pattern.

"Project source code" is defined as any TypeScript or JavaScript file found recursively under `/src` from the project root. This permissive scope is used only for locating existing injections to remove.

...

3. Add a code injection in the pattern of `if (expression) debugger; // Conditional Debug Injection` using syntax valid in the target TypeScript source file.

Constraints:
* Do not delete a debugger statement or surrounding code if a character-for-character match (step 1) wasn't made.

Zero, one, or more code injections may be deleted with this single prompt.

## Injection Instructions

1. Find one place in code where the condition can be detected. If changes in more than one place are needed, abort the code injection and explain the issue to the user.
2. If an existing injection is present that seems like it could conflict or be redundant with the new injection, abort and discuss.
3. Add a code injection in the pattern of `if (expression) debugger; // Conditional Debug Injection` using syntax valid in the target source file.

Constraints:
* Character-for-character the line must include `debugger; // Conditional Debug Injection`.
* The code injection should be on a single line, e.g. don't use `if (expression) {\n...`.
* Evaluation of the expression must not mutate any variable or have any side effect.
* Don't add helper functions or code beyond the single line.
* It is implied by other constraints but restated here - only a single line should be changed as a result of the injection.
* Don't run tests to confirm the debugger statement is working. Leave this to the user. If you have low confidence in the injection, you can express doubts or give advice to user in the completion response.

## Completion response

Changes will be visible to user in the IDE - no need to restate them.

If any problems or obstacles came up, output them concisely.

If no output was made for the previous case, respond only with "Operation complete."