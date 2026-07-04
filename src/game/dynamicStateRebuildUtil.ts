/* This module groups time-based dynamic-state rebuild coordination plus the remaining active-room effect filtering and finalization helpers that still live in this file.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section 
   in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { createDiscoveryStateSnapshot, restoreDiscoveryState } from "./dynamicStateRebuild/discoveryStateUtil";
import { applyExitState, PendingRoomEffect } from "./dynamicStateRebuild/exitStateApplicationUtil";
import { applyInventoryState } from "./dynamicStateRebuild/inventoryApplicationUtil";
import { resolveCharacterPosesAndActiveFocus } from "./dynamicStateRebuild/poseResolutionUtil";
import { applyVisibilityState } from "./dynamicStateRebuild/visibilityApplicationUtil";
import GameState from "./types/GameState";
import { createUnplacedItemsById, duplicateCharacterUsingItemIndex, duplicateCharactersByIdUsingItemIndex, duplicateItemsById, duplicateRoomUsingItemIndex } from "./itemUtil";
import { findRoomAtPosition } from "./roomUtil";
import { findActiveCharacter } from "./activeCharacterUtil";

// Rebuild the mutable runtime snapshot for a target time by replaying authored timeline effects from initial state.
export function rebuildDynamicStateForTime(gameState:GameState, time:number, previousTime:number|undefined, metaTime:number) {
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

  resolveCharacterPosesAndActiveFocus(gameState, time);
  const activeCharacter = findActiveCharacter(gameState);
  assertNonNullable(activeCharacter);
  const activeRoom = findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y);
  assertNonNullable(activeRoom);
  pendingRoomEffects
    .filter(effect => effect.roomId === activeRoom.id)
    .forEach(effect => effect.create());
  restoreDiscoveryState(gameState, discoveryStateSnapshot);
  gameState.time = time;
}