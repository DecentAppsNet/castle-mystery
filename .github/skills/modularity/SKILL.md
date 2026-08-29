---
name: modularity
description: Take small, safe steps to promote modularity and encapsulation in the codebase.
---

"I" and "me" refer to the invoker of this skill. "You" refers to the AI agent performing the operation of the skill.

I prefix any action I want you to potentially take within the operation with "DO:" so you can distinguish it from other information.

# Scope of Operation

If I haven't specified a scope of which files should be reviewed for modularity goals, assume it includes `/src` from the project root, and excludes test files, fixtures, configuration files, and basically anything besides production Typescript or Javascript.

Take extra care never to evaluate/modify inside `/node_modules`, `/workAssets`, or outside the project folder.

# General Constraints

* No modifications should change the behavior of production code.
* No modifications or evaluation should be made outside the Scope of Operation. The `npm run` scripts are an exception to this constraint.
* Do not create or execute ad-hoc scripts for analyzing or modifying the codebase. Use normal file inspection/editing capabilities and the explicitly authorized project commands instead.
* Before making a change that could cause the cumulative diff to exceed 200 changed lines, stop and ask me how to proceed.

# Setup Steps

1. DO: run `npm run build`. If the build is broken, abort the operation. (We must begin from a good state, to see if we break anything.)
2. DO: run `npm test`. If tests fail, abort the operation.
3. DO: run `npm run check:unused` and retain the output for future reference.

You can combine these into one shell command to reduce the approval interactions with me.

# Per-File Evaluation and Fixing

The steps that follow should be performed for each file in scope.

## Remove Unused

The previous call to "check:unused" (it calls the knip utility) may identify one or more of the following issues.

* unused files - DO: Call out these unused files in your operation summary. But don't delete or modify them.
* unused functions - DO: Call out these unused functions in your operation summary. But don't delete or modify them.
* unused exports - DO: Remove the export keyword from the function and prefix the function name with "_", e.g. `export function someFunc()` => `function _someFunc()`. DO: Update any calls to the function with the file to match the name.
* unused types/consts/symbols - DO: Remove the export keyword from the declaration.

If any other kind of issue is reported in the output, don't take any action around it other than calling it out to me in the operation summary.

## Fix Imports that Bypass Encapsulated Modules

* If a folder contains an `index.ts` file, that folder is an encapsulated module.
* Code inside the encapsulated module, including code in its subfolders, may call functions in the module's files without going through the API exported from `index.ts`. If a subfolder inside the encapsulated module also contains an `index.ts`, then the parent encapsulated module must call through the API exported from `index.ts` in the subfolder. Another way of wording this - an `index.ts` establishes an encapsulation boundary for its folder and subfolders, except where a subfolder establishes its own boundary with another `index.ts`.
* Code outside the encapsulated module should only access the module's functionality through functions exported from `index.ts`.
* Exception: any type definitions or helper functions exported from files in a `types` subfolder may be imported directly.
* "Pass-through APIs" are defined as unmodified exports of imported functions. They do not wrap or otherwise call encapsulated functions. Example syntax of a pass-through API within an `index.ts` file: `export { calculate } from "./private";`

The above points aid in finding bypasses. When code has bypassed the API:
* DO: If a pass-through API is available in `index.ts` that calls the encapsulated function, change the import statement in the bypassing module to use the API instead.
* DO: If no pass-through API is available, add a pass-through API to `index.ts` to the encapsulated function and change the import statement in the bypassing module to use the API instead.

# Operation Verification

* DO: Confirm that `npm run build` and `npm test` still pass after changes have been made.
* DO: If they do not pass, and you see a way to fix that follows all constraints, perform that fix. But if you have doubts, just stop and discuss. I can revert changes in the IDE or via git fairly easily.

# Operation Summary

I will see all your changes in the IDE, so I don't need you to summarize them all. 

* DO: If there were no problems or things to call out, just output "Operation complete."
* DO: Otherwise, call out problems or areas of ambiguity concisely - one line per problem. I can ask for details as needed.

