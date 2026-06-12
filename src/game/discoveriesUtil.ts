import { isCharacterInteractive, isItemInteractive } from "./interactivityUtil";
import { findCharactersInRoom, findRoomAtPosition } from "./roomUtil";
import GameState from "./types/GameState";
import Discoveries from "./types/Discoveries";
import Item from "./types/Item";

function _appendIdOnce(ids:string[], id:string) {
  if (ids.includes(id)) return;
  ids.push(id);
}

function _syncDiscoveredCharacterIds(gameState:GameState) {
  gameState.rooms
    .filter(room => room.isDiscovered && (!room.isObscured || gameState.isLevelComplete))
    .forEach(room => {
      findCharactersInRoom(room, gameState.characters).forEach(character => {
        if (!isCharacterInteractive(character)) return;
        _appendIdOnce(gameState.discoveredCharacterIds, character.id);
      });
    });
}

function _markItemDiscovered(gameState:GameState, item:Item) {
  if (!isItemInteractive(item)) return;
  if (!item.isDiscovered) item.isDiscovered = true;
  _appendIdOnce(gameState.discoveredItemIds, item.id);
}

function _syncDiscoveredItemIds(gameState:GameState) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y) : null;
  if (!activeRoom || activeRoom.isObscured) return;

  activeRoom.items.forEach(item => _markItemDiscovered(gameState, item));
  findCharactersInRoom(activeRoom, gameState.characters).forEach(character => {
    if (character.leftHandItem) _markItemDiscovered(gameState, character.leftHandItem);
    if (character.rightHandItem) _markItemDiscovered(gameState, character.rightHandItem);
  });
}

export function syncDiscoveries(gameState:GameState) {
  _syncDiscoveredCharacterIds(gameState);
  _syncDiscoveredItemIds(gameState);
}

export function createDiscoveries(gameState:GameState):Discoveries {
  return {
    discoveredCharacterIconUrls:gameState.discoveredCharacterIds.map(characterId => gameState.initialCharacters.find(character => character.id === characterId)?.faceImageUrl || ""),
    characterCount:gameState.discoverableCharacterCount,
    discoveredItemIconUrls:gameState.discoveredItemIds.map(itemId => gameState.initialItemsById.get(itemId)?.imageUrl || ""),
    itemCount:gameState.discoverableItemCount,
    discoveredRoomCount:gameState.rooms.filter(room => room.isDiscovered).length,
    roomCount:gameState.discoverableRoomCount
  };
}