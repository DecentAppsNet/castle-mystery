---
name: document
description: Add standard documentation for files, functions, types, and other symbols.
---

"I" and "me" refer to the invoker of this skill. "You" refers to the AI agent performing the operation of the skill.

I prefix any action I want you to potentially take within the operation with "DO:" so you can distinguish it from other information.

# Scope of Operation

Unless I specify otherwise, the Scope of Operation is `/src`. Only production JavaScript and TypeScript files within that directory may be modified. Exclude tests, fixtures, generated files, and configuration files.

Take extra care never to evaluate/modify inside `/node_modules`, `/workAssets`, or outside the project folder.

# General Constraints

* No modifications to code (distinct from comments).
* No modifications should be made outside the Scope of Operation. The `npm run` scripts are an exception to this constraint.
* Evaluations (not modifications) outside the Scope of Operation can be made, but only to provide context for potential modifications to files inside the Scope of Operation.
* Do not create or execute ad-hoc scripts for analyzing or modifying the codebase. Use normal file inspection/editing capabilities and the explicitly authorized project commands instead.
* The final diff for any individual file may contain at most 200 added or deleted lines combined. Before making a change that would cause a file to exceed this limit, stop modifying that file and report that its documentation was only partially completed.

# Baseline Check

1. DO: run `npm run build`. If the build is broken, abort the operation. (We must begin from a good state, to see if we break anything.)
2. DO: run `npm test`. If tests fail, abort the operation.

You can combine these into one shell command to reduce the approval interactions with me.

# General Definition of Good Documentation

* Serves the audience of a developer, somewhat familiar with the codebase, but not necessarily understanding it all well. 
* Concise, dense style of writing that delivers relevant information.
* Where applicable, use JSDoc-compatible syntax, but mainly as a consistent way to represent structured information for better readability. More esoteric or exhaustive usage of JSDoc syntax is discouraged, e.g. specifying the type of a parameter.
* Look for opportunities to deliver meaning in the documentation that may not be obvious from the name of the function.
* When a function's purpose is already obvious from its name and signature, keep documentation extremely concise. Do not invent extra explanation merely to make the documentation longer. E.g., `function sortAddressesByZipCode(addresses:Address[]):Address[]` would suffice with `Sorts addresses by zip code.`
* Use parameter or return-value descriptions only when they add information not already obvious from names and TypeScript types.
* NON-GOAL: Stating implementation details, e.g. what steps a function takes to return a result.
* NON-GOAL: Creating polished, customer-facing public API documentation.
* NON-GOAL: Meeting a certain word count or length.

# Per-File Evaluation and Fixing

The steps that follow should be performed for each *eligible* file in scope.

An eligible file is any non-test `.js` or `.ts` file that contains exported symbols and is within the scope of operation. `.tsx` files are not eligible.

## Documentation for Files

* Every eligible file that is not under a `types` subfolder should have a concise comment at the top that has the following:
  * one-sentence description of scope of functionality the file includes
  * This statement `If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes.`
* Here is an example of a file summary comment:

```Javascript
/* This file groups room-focused drawing helpers, including room shells, exits, and in-room contents. 
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
```

* DO: Add/revise file summary comments to match the requirements above.

## Documentation for Exported Functions

* DO: For any exported function that does not contain function documentation preceding its declaration, add concise JSDoc-style documentation. Endeavor to provide a clear explanation of function's behavior even if it needs research and cross-referencing to describe it well.
* DO: For any exported function that already contains function documentation preceding its declaration, review it and make changes as needed to comment to make sure it still matches what the function's current behavior is. Make minimal, non-style-based changes in this case.
* DO: For any functions that have a name that could be improved to describe its actual behavior better, report in the operation summary (later) that opportunity in a list with others. No modifications to code should be made.

Do not add documentation to re-export statements (AKA "pass-through APIs"). Document a symbol only at its declaration.

## Documentation for Private (Non-Exported) Functions

* DO: For any private function that already contains function documentation preceding its declaration, review it and make changes as needed to comment to make sure it still matches the function's current behavior.
* DO: For any functions that have a name that could be improved to describe its actual behavior better, report in the operation summary (later) that opportunity in a list with others. No modifications to code should be made.

Do not add documentation for a private function that doesn't already have it.

## Documentation for Exported Classes

A convention used in this project is that only one class is defined in a file - never multiple. Because of this, the filename summary block can double as a description of what a class does. A second convention is that the single class declared in such a file must be exported.

* DO: If an eligible file contains more than one class, or contains a non-exported class, make no modifications to that file and report that it was skipped for violating class-file conventions.

“Public method” includes methods explicitly marked public or and methods with no access modifier. Constructors and protected methods are excluded.

* DO: For any public method that does not contain documentation preceding its declaration, add concise JSDoc-style documentation. Endeavor to provide a clear explanation of method's behavior even if it needs research and cross-referencing to describe it well.
* DO: For any public method that already contains documentation preceding its declaration, review it and make changes as needed to comment to make sure it still matches the method's current behavior. Make minimal, non-style-based changes in this case.
* DO: For any private methods that have a name that could be improved to describe its actual behavior better, report in the operation summary (later) that opportunity in a list with others. No modifications to code should be made.
* DO: Don't add documentation to constructors. But if it already exists, review it for accuracy and make changes as needed to comment to make sure it still matches the method's current behavior. Make minimal, non-style-based changes in this case.

## Documentation for Other Exported Symbols

"Other Exported Symbol" (OES) includes exported types, interfaces, enums, variables, constants, and other declarations that aren't functions or classes.

* DO: If you find an exported arrow functions, report in operation summary (later) that an exported arrow function should be converted to a full function declaration.
* DO: For any OES that does not contain JSDoc-style documentation, add it. Endeavor to provide a clear explanation of the OES even if it needs research and cross-referencing to describe it well.
* DO: For any OES that already contains JSDoc-style documentation, review it and make changes as needed to comment to make sure it still matches.

Do not add/review documentation for non-exported OESs.

# Operation Verification

* DO: Confirm that `npm run build` and `npm test` still pass after changes have been made.
* DO: If they do not pass, and you see a way to fix that follows all constraints, perform that fix. But if you have doubts, just stop and discuss. I can revert changes in the IDE or via git fairly easily.

# Operation Summary

I will see all your changes in the IDE, so I don't need you to summarize them all. 

* DO: If there were no problems or things to call out, just output "Operation complete."
* DO: Otherwise, call out problems or areas of ambiguity concisely - one line per problem. I can ask for details as needed.
* DO: List any function/symbol renaming opportunities found previously.

