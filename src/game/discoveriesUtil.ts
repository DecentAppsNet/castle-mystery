import { getOwnedItems } from "./itemOwnershipUtil";
import { findCharactersInRoom } from "./roomUtil";
import GameState from "./types/GameState";
import Discoveries from "./types/Discoveries";

function _appendIdOnce(ids:string[], id:string) {
  if (ids.includes(id)) return;
  ids.push(id);
}

function _syncDiscoveredCharacterIds(gameState:GameState) {
  gameState.rooms
    .filter(room => room.isDiscovered && (!room.isObscured || gameState.isLevelComplete))
    .forEach(room => {
      findCharactersInRoom(room, gameState.characters).forEach(character => {
        _appendIdOnce(gameState.discoveredCharacterIds, character.id);
      });
    });
}

function _syncDiscoveredItemIds(gameState:GameState) {
  gameState.rooms.forEach(room => room.items.forEach(item => {
    if (!item.isDiscovered) return;
    _appendIdOnce(gameState.discoveredItemIds, item.id);
  }));
  gameState.characters.forEach(character => getOwnedItems(character).forEach(item => {
    if (!item.isDiscovered) return;
    _appendIdOnce(gameState.discoveredItemIds, item.id);
  }));
}

export function syncDiscoveries(gameState:GameState) {
  _syncDiscoveredCharacterIds(gameState);
  _syncDiscoveredItemIds(gameState);
}

export function createDiscoveries(gameState:GameState):Discoveries {
  return {
    discoveredCharacterIconUrls:gameState.discoveredCharacterIds.map(characterId => gameState.initialCharacters.find(character => character.id === characterId)?.faceImageUrl || ""),
    characterCount:gameState.initialCharacters.length,
    discoveredItemIconUrls:gameState.discoveredItemIds.map(itemId => gameState.initialItemsById.get(itemId)?.imageUrl || ""),
    itemCount:gameState.initialItemsById.size,
    discoveredRoomCount:gameState.rooms.filter(room => room.isDiscovered).length,
    roomCount:gameState.initialRooms.length
  };
}