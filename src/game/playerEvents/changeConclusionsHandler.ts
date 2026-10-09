/* This file handles player edits to conclusions, including comparison and discovery updates.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Conclusion, { duplicateConclusion } from "../conclusions/types/Conclusion";
import GameState from "../types/GameState";
import ChangeConclusionsEvent from "./types/ChangeConclusionsEvent";
import { applyCompletedConclusionRoomReveals, syncLevelCompleteState } from "./conclusionStateUtil";

function _haveSameParts(conclusion1:Conclusion, conclusion2:Conclusion):boolean {
  return JSON.stringify(conclusion1.parts) === JSON.stringify(conclusion2.parts);
}

function _haveSameConclusions(conclusion1:Conclusion, conclusion2:Conclusion):boolean {
  return conclusion1.id === conclusion2.id
    && _haveSameParts(conclusion1, conclusion2)
    && conclusion1.isComplete === conclusion2.isComplete
    && conclusion1.isLocked === conclusion2.isLocked
    && JSON.stringify(conclusion1.unlockConclusionIds) === JSON.stringify(conclusion2.unlockConclusionIds)
    && JSON.stringify(conclusion1.revealRoomIds) === JSON.stringify(conclusion2.revealRoomIds);
}

function _haveSameConclusionLists(conclusions1:ReadonlyArray<Conclusion>, conclusions2:ReadonlyArray<Conclusion>):boolean {
  return conclusions1.length === conclusions2.length && conclusions1.every((conclusion, index) => _haveSameConclusions(conclusion, conclusions2[index]));
}

export function updateGameStateForChangeConclusions(gameState:GameState, event:ChangeConclusionsEvent) {
  const nextConclusions = event.conclusions.map(duplicateConclusion);
  if (!_haveSameConclusionLists(gameState.conclusions, nextConclusions)) {
    gameState.conclusions = nextConclusions;
    gameState.conclusionsRevision += 1;
  }
  applyCompletedConclusionRoomReveals(gameState);
  const identitiesConclusion = gameState.conclusions.find(conclusion => conclusion.id === "identities") || null;
  if (identitiesConclusion?.isComplete) {
    gameState.baseCharacters.forEach(character => gameState.discoveryState.titleKnownCharacterIds.add(character.id));
  }
  syncLevelCompleteState(gameState);
}