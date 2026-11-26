/* This file applies world progress to a running level.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createDefaultSkinId } from "@/levelLoading/generalLoading";
import { isCharacterInteractive, isItemInteractive } from "./interactivityUtil";
import { getOwnedItems } from "./itemOwnershipUtil";
import { createRevealedSkinLinkages } from "./skinLinkageUtil";
import GameState from "./types/GameState";

export function revealRooms(gameState:GameState, roomIds:ReadonlyArray<string>) {
  const { obscuredRoomIds } = gameState.discoveryState;
  const previousSize = obscuredRoomIds.size;
  roomIds.forEach(roomId => obscuredRoomIds.delete(roomId));
  if (obscuredRoomIds.size === previousSize) return;
  gameState.discoveryState.revealedSkinLinkages = createRevealedSkinLinkages(gameState.timeline.keyframes,
    gameState.baseRooms, obscuredRoomIds);
}

export function revealAllCharacterTitles(gameState:GameState) {
  gameState.baseCharacters.forEach(character => gameState.discoveryState.titleKnownCharacterIds.add(character.id));
}

export function completeLevel(gameState:GameState) {
  if (gameState.isLevelComplete) return;
  gameState.isLevelComplete = true;
  const { discoveryState, baseRooms, baseCharacters } = gameState;
  const roomIds = baseRooms.map(room => room.id);
  revealRooms(gameState, roomIds);
  roomIds.forEach(roomId => discoveryState.discoveredRoomIds.add(roomId));

  baseCharacters.forEach(character => {
    if (!isCharacterInteractive(character)) return;
    discoveryState.discoveredSkinIds.add(createDefaultSkinId(character.id));
    character.skins.forEach(skin => discoveryState.discoveredSkinIds.add(skin.id));
  });

  const items = [...baseRooms.flatMap(room => room.items), ...baseCharacters.flatMap(character => getOwnedItems(character))];
  items.forEach(item => {
    if (isItemInteractive(item)) discoveryState.discoveredItemIds.add(item.id);
  });
}