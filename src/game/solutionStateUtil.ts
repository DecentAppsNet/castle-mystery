/* This module groups mutable solution-state helpers, including solution comparison, author edits, and runtime unlock syncing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { syncSolutionsWithUnlocks } from "./solutions/solutionDiscoveryUtil";
import Solution, { duplicateSolution } from "./solutions/types/Solution";
import GameState from "./types/GameState";
import ChangeSolutionsEvent from "./types/playerEvents/ChangeSolutionsEvent";

function _haveSameParts(solution1:Solution, solution2:Solution):boolean {
  return JSON.stringify(solution1.parts) === JSON.stringify(solution2.parts);
}

function _haveSameSolutions(solution1:Solution, solution2:Solution):boolean {
  return solution1.id === solution2.id
    && _haveSameParts(solution1, solution2)
    && solution1.isComplete === solution2.isComplete
    && solution1.isLocked === solution2.isLocked
    && JSON.stringify(solution1.unlockSolutionIds) === JSON.stringify(solution2.unlockSolutionIds)
    && JSON.stringify(solution1.revealRoomIds) === JSON.stringify(solution2.revealRoomIds);
}

function _haveSameSolutionLists(solutions1:ReadonlyArray<Solution>, solutions2:ReadonlyArray<Solution>):boolean {
  return solutions1.length === solutions2.length && solutions1.every((solution, index) => _haveSameSolutions(solution, solutions2[index]));
}

function _isLevelComplete(solutions:ReadonlyArray<Solution>):boolean {
  return solutions.every(solution => !solution.isLocked && solution.isComplete);
}

function _syncLevelCompleteState(gameState:GameState):boolean {
  const nextIsLevelComplete = _isLevelComplete(gameState.solutions);
  if (nextIsLevelComplete === gameState.isLevelComplete) return false;
  gameState.isLevelComplete = nextIsLevelComplete;
  return true;
}

function _applyCompletedSolutionRoomReveals(gameState:GameState) {
  const revealedRoomIds = new Set(gameState.solutions
    .filter(solution => solution.isComplete)
    .flatMap(solution => solution.revealRoomIds));
  if (!revealedRoomIds.size) return;
  gameState.rooms.forEach(room => {
    if (revealedRoomIds.has(room.id)) room.isObscured = false;
  });
  gameState.initialRooms.forEach(room => {
    if (revealedRoomIds.has(room.id)) room.isObscured = false;
  });
}

export function syncSolutionUnlocks(gameState:GameState):boolean {
  const { solutions, didChange } = syncSolutionsWithUnlocks(gameState.solutions);
  if (didChange) {
    gameState.solutions = solutions;
    gameState.solutionsRevision += 1;
  }
  _applyCompletedSolutionRoomReveals(gameState);
  _syncLevelCompleteState(gameState);
  return didChange;
}

export function updateGameStateForChangeSolutions(gameState:GameState, event:ChangeSolutionsEvent) {
  const nextSolutions = event.solutions.map(duplicateSolution);
  if (!_haveSameSolutionLists(gameState.solutions, nextSolutions)) {
    gameState.solutions = nextSolutions;
    gameState.solutionsRevision += 1;
  }
  _applyCompletedSolutionRoomReveals(gameState);
  const identitiesSolution = gameState.solutions.find(solution => solution.id === "identities") || null;
  if (!identitiesSolution?.isComplete) return;
  gameState.characters.forEach(character => {
    character.isTitleKnown = true;
  });
  gameState.initialCharacters.forEach(character => {
    character.isTitleKnown = true;
  });
  _syncLevelCompleteState(gameState);
}