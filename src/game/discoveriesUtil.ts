import { isCharacterInteractive, isItemInteractive } from "./interactivityUtil";
import GameState from "./types/GameState";
import Discoveries from "./types/Discoveries";
import Item from "./types/Item";
import Character from "./types/Character";
import { assertNonNullable } from "decent-portal";

function _appendIdOnce(ids:string[], id:string) {
  if (ids.includes(id)) return;
  ids.push(id);
}

export function markCharacterDiscovered(gameState:GameState, character:Character) {
  if (!isCharacterInteractive(character)) return;
  if (!character.isDiscovered) character.isDiscovered = true;
  _appendIdOnce(gameState.discoveredCharacterIds, character.id);
}

export function markItemDiscovered(gameState:GameState, item:Item) {
  if (!isItemInteractive(item)) return;
  if (!item.isDiscovered) item.isDiscovered = true;
  _appendIdOnce(gameState.discoveredItemIds, item.id);
  const baseItem = gameState.baseItemsById.get(item.id);
  assertNonNullable(baseItem);
  baseItem.isDiscovered = true;
}

export function createDiscoveries(gameState:GameState):Discoveries {
  return {
    discoveredCharacterIconUrls:gameState.discoveredCharacterIds.map(characterId => 
      gameState.baseCharacters.find(character => character.id === characterId)?.faceImageUrl ?? ""),
    characterCount:gameState.discoverableCharacterCount,
    discoveredItemIconUrls:gameState.discoveredItemIds.map(itemId => gameState.baseItemsById.get(itemId)?.imageUrl || ""),
    itemCount:gameState.discoverableItemCount,
    discoveredRoomCount:gameState.baseRooms.filter(room => room.isDiscovered).length,
    roomCount:gameState.discoverableRoomCount
  };
}