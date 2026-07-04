/* This module groups discovery-state snapshot and restore helpers used during dynamic-state rebuild, 
   meaning the rebuild process that starts from initial runtime state and re-applies authored timeline events up to a target time.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import GameState from "../types/GameState";
import { getOwnedItems } from "../itemOwnershipUtil";

export type DiscoveryStateSnapshot = {
  discoveredRoomIds:Set<string>,
  discoveredItemIds:Set<string>,
  discoveredCharacterIds:Set<string>,
  characterDiscoveredRoomIds:Map<string, string[]>
}

// Snapshot which rooms were already discovered before rebuild resets runtime state.
function _getDiscoveredRoomIds(gameState:GameState):Set<string> {
  return new Set(gameState.rooms.filter(room => room.isDiscovered).map(room => room.id));
}

// Snapshot per-character discovered rooms so rebuild can restore them afterward.
function _getCharacterDiscoveredRoomIds(gameState:GameState):Map<string, string[]> {
  const discoveredRoomIdsByCharacterId = new Map<string, string[]>();
  gameState.characters.forEach(character => discoveredRoomIdsByCharacterId.set(character.id, [...character.discoveredRoomIds]));
  gameState.unplacedCharactersById.forEach(character => discoveredRoomIdsByCharacterId.set(character.id, [...character.discoveredRoomIds]));
  return discoveredRoomIdsByCharacterId;
}

// Collect every character already marked discovered across placed and unplaced runtime state.
function _getDiscoveredCharacterIds(gameState:GameState):Set<string> {
  return new Set([
    ...gameState.discoveredCharacterIds,
    ...gameState.characters.filter(character => character.isDiscovered).map(character => character.id),
    ...Array.from(gameState.unplacedCharactersById.values()).filter(character => character.isDiscovered).map(character => character.id)
  ]);
}

// Collect every item already marked discovered across rooms, inventories, and unplaced storage.
function _getDiscoveredItemIds(gameState:GameState):Set<string> {
  const discoveredItemIds = new Set<string>();
  gameState.rooms.forEach(room => room.items.forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  }));
  gameState.characters.forEach(character => getOwnedItems(character).forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  }));
  gameState.unplacedItemsById.forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  });
  return discoveredItemIds;
}

// Capture discovery-related state that must survive a rebuild from initial runtime data.
export function createDiscoveryStateSnapshot(gameState:GameState):DiscoveryStateSnapshot {
  return {
    discoveredRoomIds:_getDiscoveredRoomIds(gameState),
    discoveredItemIds:_getDiscoveredItemIds(gameState),
    discoveredCharacterIds:_getDiscoveredCharacterIds(gameState),
    characterDiscoveredRoomIds:_getCharacterDiscoveredRoomIds(gameState)
  };
}

// Reapply discovery flags after rebuild recreates rooms, characters, and items from initial state.
export function restoreDiscoveryState(gameState:GameState, snapshot:DiscoveryStateSnapshot) {
  gameState.rooms.forEach(room => {
    if (snapshot.discoveredRoomIds.has(room.id)) room.isDiscovered = true;
    room.items.forEach(item => {
      if (snapshot.discoveredItemIds.has(item.id)) item.isDiscovered = true;
    });
  });
  gameState.characters.forEach(character => getOwnedItems(character).forEach(item => {
    if (snapshot.discoveredItemIds.has(item.id)) item.isDiscovered = true;
  }));
  gameState.unplacedItemsById.forEach(item => {
    if (snapshot.discoveredItemIds.has(item.id)) item.isDiscovered = true;
  });
  [...gameState.characters, ...gameState.unplacedCharactersById.values()].forEach(character => {
    if (snapshot.discoveredCharacterIds.has(character.id)) character.isDiscovered = true;
    character.discoveredRoomIds = [...(snapshot.characterDiscoveredRoomIds.get(character.id) || [])];
  });
}