/* This file synchronizes conclusion unlocks, room reveals, and level completion state.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createDefaultSkinId } from "@/levelLoading/generalLoading";
import { syncConclusionsWithUnlocks } from "../conclusions/conclusionDiscoveryUtil";
import Conclusion from "../conclusions/types/Conclusion";
import { isCharacterInteractive, isItemInteractive } from "../interactivityUtil";
import { getOwnedItems } from "../itemOwnershipUtil";
import Character from "../types/Character";
import GameState from "../types/GameState";
import { createRevealedSkinLinkages } from "../skinLinkageUtil";

function _isLevelComplete(conclusions:ReadonlyArray<Conclusion>):boolean {
  return conclusions.every(conclusion => !conclusion.isLocked && conclusion.isComplete);
}

export function syncLevelCompleteState(gameState:GameState):boolean {
  const nextIsLevelComplete = _isLevelComplete(gameState.conclusions);
  if (nextIsLevelComplete === gameState.isLevelComplete) return false;
  gameState.isLevelComplete = nextIsLevelComplete;
  if (nextIsLevelComplete) { _applyLevelCompleteReveal(gameState); }
  return true;
}

function _addDiscoveredCharacterSkinIds(baseCharacters:Character[], discoveredSkinIds:Set<string>) {
  baseCharacters.forEach(character => {
    if (!isCharacterInteractive(character)) return;
    discoveredSkinIds.add(createDefaultSkinId(character.id));
    character.skins.forEach(s => discoveredSkinIds.add(s.id));
  });
}

function _applyLevelCompleteReveal(gameState:GameState) {
  const { discoveryState } = gameState;
  gameState.baseRooms.forEach(room => {
    discoveryState.discoveredRoomIds.add(room.id);
    discoveryState.obscuredRoomIds.delete(room.id);
  });

  _addDiscoveredCharacterSkinIds(gameState.baseCharacters, discoveryState.discoveredSkinIds);
  discoveryState.revealedSkinLinkages = createRevealedSkinLinkages(gameState.timeline.keyframes, 
    gameState.baseRooms, discoveryState.obscuredRoomIds);
  
  const markItemDiscovered = (item:{ id:string, description:string }) => {
    if (!isItemInteractive(item)) return;
    discoveryState.discoveredItemIds.add(item.id);
  };
  const discoverableInitialItems = new Set([
    ...gameState.baseRooms.flatMap(room => room.items),
    ...gameState.baseCharacters.flatMap(character => getOwnedItems(character))
  ]);

  discoverableInitialItems.forEach(markItemDiscovered);
}

export function applyCompletedConclusionRoomReveals(gameState:GameState) {
  const revealedRoomIds = new Set(gameState.conclusions
    .filter(conclusion => conclusion.isComplete)
    .flatMap(conclusion => conclusion.revealRoomIds));
  if (!revealedRoomIds.size) return;

  const { obscuredRoomIds } = gameState.discoveryState;
  revealedRoomIds.forEach(roomId => obscuredRoomIds.delete(roomId));
  gameState.discoveryState.revealedSkinLinkages = createRevealedSkinLinkages(gameState.timeline.keyframes, 
    gameState.baseRooms, obscuredRoomIds);
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