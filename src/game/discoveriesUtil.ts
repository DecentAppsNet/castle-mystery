import { isCharacterInteractive, isItemInteractive } from "./interactivityUtil";
import GameState from "./types/GameState";
import Discoveries from "./types/Discoveries";
import Item from "./types/Item";
import Character from "./types/Character";
import { createDefaultSkinId, parseSkinId } from "@/levelLoading/generalLoading";
import { assertNonNullable } from "decent-portal";
import { NO_SKIN_DEFAULT } from "@/levelLoading/activityLoading/activitySchedulers/appearsScheduler";

function _skinIdsToCharacterIconUrls(skinIdSet:Set<string>, baseCharacters:Character[]):string[] {
  const skinIds = [...skinIdSet];
  return skinIds.map(skinId => {
    const { characterId, skinName } = parseSkinId(skinId);
    const character = baseCharacters.find(character => character.id === characterId);
    assertNonNullable(character);
    if (skinName === NO_SKIN_DEFAULT) return character.faceImageUrl ?? '';
    const skin = character.skins.find(s => s.id === skinId);
    assertNonNullable(skin);
    return skin.faceImageUrl ?? '';
  });
}

export function markCharacterDiscovered(gameState:GameState, character:Character) {
  if (!isCharacterInteractive(character)) return;
  const skinId = character.skinId ?? createDefaultSkinId(character.id);
  gameState.discoveryState.discoveredSkinIds.add(skinId);
}

export function markItemDiscovered(gameState:GameState, item:Item) {
  if (!isItemInteractive(item)) return;
  gameState.discoveryState.discoveredItemIds.add(item.id);
}

export function createDiscoveries(gameState:GameState):Discoveries {
  const { discoveryState } = gameState;
  return {
    discoveredCharacterIconUrls:_skinIdsToCharacterIconUrls(discoveryState.discoveredSkinIds, gameState.baseCharacters),
    characterCount:discoveryState.discoverableCharacterCount,
    discoveredItemIconUrls:[...discoveryState.discoveredItemIds].map(itemId => gameState.baseItemsById.get(itemId)?.imageUrl || ""),
    itemCount:discoveryState.discoverableItemCount,
    discoveredRoomCount:discoveryState.discoveredRoomIds.size,
    roomCount:discoveryState.discoverableRoomCount
  };
}