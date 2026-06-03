/* This module groups shared target lookup helpers used by authored activity loaders.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { getOwnedItems } from "@/game/itemOwnershipUtil";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import Level from "@/game/types/Level";
import Position, { duplicatePosition } from "@/game/types/Position";
import Room from "@/game/types/Room";

import { matchesItemReference } from "./activityItemRefUtil";
import { findStatePoseAtTime } from "./activityStateUtil";
import type CharacterActivityState from "./types/CharacterActivityState";

export function findRoomItemById(roomItemsByRoomId:Map<string, Item[]>, level:Level, itemId:string):{ room:Room, item:Item }|null {
  for (const room of level.rooms) {
    const roomItems = roomItemsByRoomId.get(room.id) || [];
    const item = roomItems.find(candidate => matchesItemReference(candidate, itemId)) || null;
    if (item) return { room, item };
  }
  return null;
}

export function findTargetPositionAtTime(targetId:string, timestamp:number, charactersById:Map<string, Character>,
  characterStatesById:Map<string, CharacterActivityState>, roomItemsByRoomId:Map<string, Item[]>, poseOverridesByCharacterId?:Map<string, Position>):Position|null {
  const targetCharacter = charactersById.get(targetId) || null;
  if (targetCharacter) {
    const poseOverride = poseOverridesByCharacterId?.get(targetId);
    if (poseOverride) return duplicatePosition(poseOverride);
    const targetState = characterStatesById.get(targetId);
    assertNonNullable(targetState, `missing itinerary state for character ${targetId}`);
    return findStatePoseAtTime(targetCharacter, targetState, timestamp).position;
  }

  for (const roomItems of roomItemsByRoomId.values()) {
    const item = roomItems.find(candidate => matchesItemReference(candidate, targetId)) || null;
    if (item) return duplicatePosition(item.position);
  }

  for (const [characterId, state] of characterStatesById.entries()) {
    const item = getOwnedItems(state).find(candidate => matchesItemReference(candidate, targetId)) || null;
    if (!item) continue;
    const targetCharacterForItem = charactersById.get(characterId) || null;
    assertNonNullable(targetCharacterForItem, `missing character ${characterId} for carried item ${targetId}`);
    return findStatePoseAtTime(targetCharacterForItem, state, timestamp).position;
  }

  return null;
}