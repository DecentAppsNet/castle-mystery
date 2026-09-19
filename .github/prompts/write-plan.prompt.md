---
name: Write Plan
description: "Research a requested project change and create a phased implementation plan under workAssets/plans."
argument-hint: "Describe where requirements and other input are found"
agent: "agent"
---

# Write a Project Plan

Use the informal requirements and design context preceding this prompt as the basis for a new implementation plan.

## Clarification threshold

- If the requirements or design are fundamentally unclear, stop and discuss them before continuing.
- If an important decision would significantly change the plan's architecture or scope, stop and discuss it before continuing.
- Do not ask questions that can easily be resolved through review of the completed plan. Choose a reasonable initial value for refinements such as animation timing and document it for review.

For example, whether performance-oriented data-structure changes belong in scope can justify an upfront question. The precise delay of an otherwise-defined animation generally does not.

## Output location

Create a new Markdown plan file under `workAssets/plans` from the project root. Use a concise descriptive filename.

## Plan requirements

- Write a self-contained handoff for the same model in a fresh conversation. The implementing agent will not have this chat history or session memory.
- Divide implementation into independently testable phases.
- Limit each phase to at most 100 changed production-source lines, additions plus deletions. Generated files, tests, fixtures, documentation, and the plan do not count.
- Require the implementing agent to stop after every phase for human review and explicit approval before proceeding.
- Require the implementing agent to stop before exceeding a phase's production-line limit and discuss how to repartition the work.
- Include a Phase 0 that establishes a clean baseline before source changes: inspect the worktree, read the relevant files and instructions, run check:unused, and run the applicable build and tests. Where practical, combine shell requests together, e.g. `npm run build & npm test & npm check:unused`, to reduce user approvals.
- Incorporate relevant constraints from `CONTRIBUTING.md`, ADRs, and repository instructions. Either summarize the essential constraints or explicitly require reading the applicable project files.
- Account for concurrent user changes: require target files to be re-read before editing and unrelated work to be preserved.
- Include validation appropriate to each phase and a final verification phase.
- Do not instruct the implementing agent to access files outside the project folder.

## Completion response

The plan file is the deliverable. If there are no problems or unresolved ambiguities, respond only with `Operation complete.` after creating it. Otherwise, list each problem or ambiguity in one concise line.