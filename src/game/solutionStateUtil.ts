/* This module groups mutable solution-state helpers, including solution comparison, author edits, and runtime unlock syncing. */

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
    && solution1.unlockForItemId === solution2.unlockForItemId
    && solution1.unlockForSolutionId === solution2.unlockForSolutionId;
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

export function syncSolutionUnlocks(gameState:GameState):boolean {
  const { solutions, didChange } = syncSolutionsWithUnlocks(gameState.solutions, gameState.viewedItemIds);
  if (didChange) {
    gameState.solutions = solutions;
    gameState.solutionsRevision += 1;
  }
  _syncLevelCompleteState(gameState);
  return didChange;
}

export function updateGameStateForChangeSolutions(gameState:GameState, event:ChangeSolutionsEvent) {
  const nextSolutions = event.solutions.map(duplicateSolution);
  if (!_haveSameSolutionLists(gameState.solutions, nextSolutions)) {
    gameState.solutions = nextSolutions;
    gameState.solutionsRevision += 1;
  }
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