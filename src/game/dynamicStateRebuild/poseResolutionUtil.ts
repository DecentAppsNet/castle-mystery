/* This module groups pose and active-focus resolution helpers used during dynamic-state rebuild, meaning the rebuild process that starts from initial runtime state and re-applies authored timeline events up to a target time.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { findActiveCharacter } from "../activeCharacterUtil";
import { findCharacterPose } from "../itineraryUtil";
import GameState from "../types/GameState";
import { findCharacterReplacementEvent } from "./replayCharacterUtil";

// Rewind active focus to the source identity when scrubbing to before an incoming replacement.
function _normalizeActiveCharacterForTime(gameState:GameState, time:number) {
  if (!gameState.unplacedCharactersById.has(gameState.activeCharacterId)) return;
  const activeCharacter = findActiveCharacter(gameState);
  assertNonNullable(activeCharacter);
  const replacementEvent = findCharacterReplacementEvent(activeCharacter);
  if (replacementEvent && time < replacementEvent.startTime) {
    gameState.activeCharacterId = replacementEvent.sourceCharacterId;
  }
}

// Resolve placed-character poses and then normalize active focus for the target time.
export function resolveCharacterPosesAndActiveFocus(gameState:GameState, time:number) {
  gameState.characters.forEach(character => {
    const pose = findCharacterPose(character, time);
    character.position = { ...pose.position };
    character.isAlive = pose.isAlive;
    character.facingDirection = pose.facingDirection;
    character.bodyOrientation = pose.bodyOrientation;
  });
  _normalizeActiveCharacterForTime(gameState, time);
}