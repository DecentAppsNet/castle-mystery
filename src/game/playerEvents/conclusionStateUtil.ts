/* This file synchronizes conclusion unlocks, room reveals, and level completion state.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { syncConclusionsWithUnlocks } from "../conclusions/conclusionDiscoveryUtil";
import Conclusion from "../conclusions/types/Conclusion";
import GameState from "../types/GameState";
import { completeLevel, revealRooms } from "../worldProgressUtil";

function _isLevelComplete(conclusions:ReadonlyArray<Conclusion>):boolean {
  return conclusions.every(conclusion => !conclusion.isLocked && conclusion.isComplete);
}

export function syncLevelCompleteState(gameState:GameState):boolean {
  const nextIsLevelComplete = _isLevelComplete(gameState.conclusions);
  if (!nextIsLevelComplete || gameState.isLevelComplete) return false;
  completeLevel(gameState);
  return true;
}

export function applyCompletedConclusionRoomReveals(gameState:GameState) {
  revealRooms(gameState, gameState.conclusions
    .filter(conclusion => conclusion.isComplete)
    .flatMap(conclusion => conclusion.revealRoomIds));
}

export function syncConclusionUnlocks(gameState:GameState):boolean {
  const { conclusions, didChange } = syncConclusionsWithUnlocks(gameState.conclusions);
  if (didChange) {
    gameState.conclusions = conclusions;
    gameState.conclusionsRevision += 1;
  }
  applyCompletedConclusionRoomReveals(gameState);
  syncLevelCompleteState(gameState);
  return didChange;
}