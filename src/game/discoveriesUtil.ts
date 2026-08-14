import { isCharacterInteractive, isItemInteractive } from "./interactivityUtil";
import GameState from "./types/GameState";
import Discoveries from "./types/Discoveries";
import Item from "./types/Item";
import Character from "./types/Character";

export function markCharacterDiscovered(gameState:GameState, character:Character) {
  if (!isCharacterInteractive(character)) return;
  gameState.discoveryState.discoveredCharacterIds.add(character.id);
}

export function markItemDiscovered(gameState:GameState, item:Item) {
  if (!isItemInteractive(item)) return;
  gameState.discoveryState.discoveredItemIds.add(item.id);
}

export function createDiscoveries(gameState:GameState):Discoveries {
  const { discoveryState } = gameState;
  return {
    discoveredCharacterIconUrls:[...discoveryState.discoveredCharacterIds].map(characterId =>
      gameState.baseCharacters.find(character => character.id === characterId)?.faceImageUrl ?? ""),
    characterCount:discoveryState.discoverableCharacterCount,
    discoveredItemIconUrls:[...discoveryState.discoveredItemIds].map(itemId => gameState.baseItemsById.get(itemId)?.imageUrl || ""),
    itemCount:discoveryState.discoverableItemCount,
    discoveredRoomCount:discoveryState.discoveredRoomIds.size,
    roomCount:discoveryState.discoverableRoomCount
  };
}