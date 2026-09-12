/* This file derives discoverable entity counts from loaded level content and activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { isCharacterInteractive, isItemInteractive } from "@/game/interactivityUtil";
import Character from "@/game/types/Character";
import Level from "@/game/types/Level";
import Room from "@/game/types/Room";
import Activity from "../activityLoading/types/Activity";
import { createSkinId } from "../generalLoading";

function _findReferencedSkinIds(activities:readonly Activity[]):Set<string> {
  const skinIds = new Set<string>();
  activities.forEach(activity => {
    if (activity.verb !== 'appears') return;
    const { characterId, skinName } = activity.parts;
    if (typeof characterId === 'string' && typeof skinName === 'string') skinIds.add(createSkinId(characterId, skinName));
  });
  return skinIds;
}

function _countDiscoverableCharacters(characters:readonly Character[], referencedSkinIds:Set<string>):number {
  let count = 0;
  characters.forEach(character => {
    if (isCharacterInteractive(character)) {
      count += character.skins.filter(skin => referencedSkinIds.has(skin.id)).length + 1; // The default appearance is always discoverable.
    }
  });
  return count;
}

// An item should be counted as discoverable if it's interactive and...
//  in a room OR
//  in a character's left/right hand OR
//  in character inventory and referenced in itinerary
function _countDiscoverableItems(characters:readonly Character[], rooms:readonly Room[], activities:readonly Activity[]):number {
  const countedItemIds = new Set<string>();
  const activityReferencedItemIds = new Set<string>();

  activities.forEach(activity => {
    const itemId = activity.parts.itemId;
    const toItemId = activity.parts.toItemId;
    if (typeof itemId === 'string') activityReferencedItemIds.add(itemId);
    if (typeof toItemId === 'string') activityReferencedItemIds.add(toItemId);
  });

  characters.forEach(character => {
    if (character.leftHandItem && isItemInteractive(character.leftHandItem)) countedItemIds.add(character.leftHandItem.id);
    if (character.rightHandItem && isItemInteractive(character.rightHandItem)) countedItemIds.add(character.rightHandItem.id);
    character.items.forEach(item => {
      if (isItemInteractive(item) && activityReferencedItemIds.has(item.id)) countedItemIds.add(item.id);
    });
  });
  rooms.forEach(room => {
    room.items.forEach(item => {
      if (isItemInteractive(item)) countedItemIds.add(item.id);
    });
  });
  
  return countedItemIds.size;
}

/**
 * Counts discoverable characters, contextually discoverable items, and rooms.
 *
 * @param level - Loaded level whose `characters` contain only the characters directly referenced by room placement.
 * @param activities - Parsed itinerary activities that determine which character skins and inventory items are discoverable.
 * @returns The calculated discoverable counts before optional authored overrides are applied.
 */
export function findDiscoverableCounts(level:Level, activities:readonly Activity[]):{discoverableCharacterCount:number, discoverableItemCount:number, discoverableRoomCount:number} {
  const referencedSkinIds = _findReferencedSkinIds(activities);
  const discoverableCharacterCount = _countDiscoverableCharacters(level.characters, referencedSkinIds);
  const discoverableItemCount = _countDiscoverableItems(level.characters, level.rooms, activities);
  const discoverableRoomCount = level.rooms.length;
  return { discoverableCharacterCount, discoverableItemCount, discoverableRoomCount };
}