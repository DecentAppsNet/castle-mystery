/* This module groups time-based dynamic-state rebuild coordination across reset, replay phases, pose resolution, and finalization.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section 
   in CONTRIBUTING.md before making changes. */

import { createDiscoveryStateSnapshot } from "./dynamicStateRebuild/discoveryStateUtil";
import { applyExitState, PendingRoomEffect } from "./dynamicStateRebuild/exitStateApplicationUtil";
import { finalizeDynamicStateRebuild } from "./dynamicStateRebuild/finalizationUtil";
import { applyInventoryState } from "./dynamicStateRebuild/inventoryApplicationUtil";
import { resolveCharacterPosesAndActiveFocus } from "./dynamicStateRebuild/poseResolutionUtil";
import { applyVisibilityState } from "./dynamicStateRebuild/visibilityApplicationUtil";
import GameState from "./types/GameState";
import { createUnplacedItemsById, duplicateCharacterUsingItemIndex, duplicateCharactersByIdUsingItemIndex, duplicateItemsById, duplicateRoomUsingItemIndex } from "./itemUtil";
import { assert } from "decent-portal";

// Rebuild the mutable runtime snapshot for a target time by replaying authored timeline effects from initial state.
export function rebuildDynamicStateForTime(gameState:GameState, time:number, previousTime:number|undefined, metaTime:number) {
  const originalActiveCharacterId = gameState.activeCharacterId;
  const discoveryStateSnapshot = createDiscoveryStateSnapshot(gameState);
  const pendingRoomEffects:PendingRoomEffect[] = [];
  gameState.itemsById = duplicateItemsById(gameState.initialItemsById);
  gameState.characters = gameState.initialCharacters.map(character => duplicateCharacterUsingItemIndex(character, gameState.itemsById));
  gameState.rooms = gameState.initialRooms.map(room => duplicateRoomUsingItemIndex(room, gameState.itemsById));
  gameState.unplacedCharactersById = duplicateCharactersByIdUsingItemIndex(gameState.initialUnplacedCharactersById, gameState.itemsById);
  gameState.unplacedItemsById = createUnplacedItemsById(gameState.itemsById, gameState.rooms, gameState.characters);

  applyVisibilityState(gameState, time);
  applyInventoryState(gameState, time, previousTime, metaTime, pendingRoomEffects);
  applyExitState(gameState, time, previousTime, metaTime, pendingRoomEffects);
  assert(gameState.activeCharacterId === originalActiveCharacterId, 'Prior to resolveCharacterPosesAndActiveFocus() call, no changes to gameState.activeCharacterId should be made.');
  resolveCharacterPosesAndActiveFocus(gameState, time);
  finalizeDynamicStateRebuild(gameState, time, pendingRoomEffects, discoveryStateSnapshot);
}