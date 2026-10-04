---
name: Implement Plan
description: "Start implementation based on a plan file"
argument-hint: "Name of chat session"
agent: "agent"
---

# Overview

Implement functionality based on plan file provided by the user.

## Interpreting Arguments

Don't interpret them. 

The argument is a signal to Github Copilot on how the chat session should be named. The /Implement-Plan command will likely be the first prompt of a chat session.

If the user provides an empty argument or doesn't follow the session-naming pattern, it doesn't matter to you, the agent.

## Checking Readiness to Implement

Readiness conditions:
* The active file in the IDE should be markdown-formatted file within the `/workAssets/plans` folder.
* User-argument-provided instructions should be unambiguous and able to be combined coherently with document instructions.
* The active file contains a definition for initial work to complete in "Phase 0".
* The current chat session should contain 5 or less prompts from the user. (This check is to catch when the user forgot to begin a new chat session before issuing the /Implement-Plan command.)

If any of above conditions are not met, abort implementation and discuss with user.

## Implementation Instructions

1. Read and consider the full plan file.
2. Abort and ask questions of the user if you don't understand how to follow the plan. The plan will have been previously designed to answer all questions needed, and you do have an ability to surface questions later between phases, so your threshold for asking questions should be high.
3. Begin with phase 0 of the plan, and simply follow instructions in the plan.

## Completion response

No completion response specific to this prompt is needed. This prompt is just streamlining the user's typical requests for beginning work on a plan. The user will be more interested in your responses at end of phases in the plan, and here you can provide your normal output.