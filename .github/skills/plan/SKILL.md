---
name: plan
description: Create a plan file to implement a set of requested changes in the project.
---

"I" and "me" refer to the invoker of this skill. "You" refers to the AI agent performing the operation of the skill.

I prefix any action I want you to potentially take within the operation with "DO:" so you can distinguish it from other information.

# Requirements and Design Input

I will provide a more informal or higher-level source of requirements and design in the chat context preceding the invocation of the skill. We may have discussed it in chat and came to alignment. I might have referenced one or more files providing more context.

This input will be the basis of your creation of a plan file.

DO: If the requirements and design input are unclear, stop an discuss before continuing.

# Location of Plan File

The location of the plan file will be under `/workAssets/plans` from project root.

DO: Create a new plan file in markdown format at the plan file location.

# Requirements for Plan File Creations

You are already trained well to create plans, and I don't want to override your good default behavior. So do what you would normally do to create a plan file and use these additional requirements. The omission of something you normally do in plan writing does not mean it shouldn't be done.

* DO: Write with the expectation that the plan will be given to the same model (e.g., Sol / Terra) in a fresh context session. The agent will not have access to our chat session and other persistence mechanisms.
* DO: Divide the work into testable phases each with a maximum of 100 lines (add + delete) in production source code (generated files, test files do not count toward this limit). The plan should specify that the agent stop after each phase for me to review and approve changes. I will signal the agent to continue to later phases when I'm ready. The plan should specify that if the agent learns that changes will go beyond the 100 line limit, they stop and discuss with me before continuing.
* DO: Include any relevant context from ADRs or CONTRIBUTING.md. You can inline content into the plan or ask the implementing agent to read a file.

Never include instructions in the plan to access files outside of the project folder.

# Operation Summary

I will see all your changes in the IDE, so I don't need you to summarize them all. 

* DO: If there were no problems or things to call out, just output "Operation complete."
* DO: Otherwise, call out problems or areas of ambiguity concisely - one line per problem. I can ask for details as needed.
