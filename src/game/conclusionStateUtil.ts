/* This module groups mutable conclusion-state helpers, including conclusion comparison, author edits, and runtime unlock syncing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { syncConclusionsWithUnlocks } from "./conclusions/conclusionDiscoveryUtil";
import Conclusion, { duplicateConclusion } from "./conclusions/types/Conclusion";
import { isCharacterInteractive, isItemInteractive } from "./interactivityUtil";
import { getOwnedItems } from "./itemOwnershipUtil";
import GameState from "./types/GameState";
import ChangeConclusionsEvent from "./types/playerEvents/ChangeConclusionsEvent";

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

function _isLevelComplete(conclusions:ReadonlyArray<Conclusion>):boolean {
  return conclusions.every(conclusion => !conclusion.isLocked && conclusion.isComplete);
}

function _syncLevelCompleteState(gameState:GameState):boolean {
  const nextIsLevelComplete = _isLevelComplete(gameState.conclusions);
  if (nextIsLevelComplete === gameState.isLevelComplete) return false;
  gameState.isLevelComplete = nextIsLevelComplete;
  if (nextIsLevelComplete) _applyLevelCompleteReveal(gameState);
  return true;
}

function _applyLevelCompleteReveal(gameState:GameState) {
  gameState.rooms.forEach(room => {
    room.isDiscovered = true;
    room.isObscured = false;
  });
  gameState.initialRooms.forEach(room => {
    room.isDiscovered = true;
    room.isObscured = false;
  });

  gameState.discoveredCharacterIds = gameState.initialCharacters
    .filter(isCharacterInteractive)
    .map(character => character.id);
  gameState.characters.forEach(character => {
    if (isCharacterInteractive(character)) character.isDiscovered = true;
  });
  gameState.initialCharacters.forEach(character => {
    if (isCharacterInteractive(character)) character.isDiscovered = true;
  });

  const discoveredItemIds = new Set<string>();
  const markItemDiscovered = (item:{ id:string, description:string, isDiscovered:boolean }) => {
    if (!isItemInteractive(item)) return;
    item.isDiscovered = true;
    discoveredItemIds.add(item.id);
  };
  const discoverableInitialItems = new Set([
    ...gameState.initialRooms.flatMap(room => room.items),
    ...gameState.initialCharacters.flatMap(character => getOwnedItems(character))
  ]);

  discoverableInitialItems.forEach(markItemDiscovered);
  gameState.itemsById.forEach(item => {
    if (discoveredItemIds.has(item.id)) item.isDiscovered = true;
  });
  gameState.rooms.forEach(room => room.items.forEach(item => {
    if (discoveredItemIds.has(item.id)) item.isDiscovered = true;
  }));
  gameState.characters.forEach(character => getOwnedItems(character).forEach(item => {
    if (discoveredItemIds.has(item.id)) item.isDiscovered = true;
  }));
  gameState.discoveredItemIds = [...discoveredItemIds];
}

function _applyCompletedConclusionRoomReveals(gameState:GameState) {
  const revealedRoomIds = new Set(gameState.conclusions
    .filter(conclusion => conclusion.isComplete)
    .flatMap(conclusion => conclusion.revealRoomIds));
  if (!revealedRoomIds.size) return;
  gameState.rooms.forEach(room => {
    if (revealedRoomIds.has(room.id)) room.isObscured = false;
  });
  gameState.initialRooms.forEach(room => {
    if (revealedRoomIds.has(room.id)) room.isObscured = false;
  });
}

export function syncConclusionUnlocks(gameState:GameState):boolean {
  const { conclusions, didChange } = syncConclusionsWithUnlocks(gameState.conclusions);
  if (didChange) {
    gameState.conclusions = conclusions;
    gameState.conclusionsRevision += 1;
  }
  _applyCompletedConclusionRoomReveals(gameState);
  _syncLevelCompleteState(gameState);
  return didChange;
}

export function updateGameStateForChangeConclusions(gameState:GameState, event:ChangeConclusionsEvent) {
  const nextConclusions = event.conclusions.map(duplicateConclusion);
  if (!_haveSameConclusionLists(gameState.conclusions, nextConclusions)) {
    gameState.conclusions = nextConclusions;
    gameState.conclusionsRevision += 1;
  }
  _applyCompletedConclusionRoomReveals(gameState);
  const identitiesConclusion = gameState.conclusions.find(conclusion => conclusion.id === "identities") || null;
  if (identitiesConclusion?.isComplete) {
    gameState.characters.forEach(character => {
      character.isTitleKnown = true;
    });
    gameState.initialCharacters.forEach(character => {
      character.isTitleKnown = true;
    });
  }
  _syncLevelCompleteState(gameState);
}