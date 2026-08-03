import { isCharacterInteractive, isItemInteractive } from "@/game/interactivityUtil";
import Character from "@/game/types/Character";
import Level from "@/game/types/Level";
import Room from "@/game/types/Room";
import Activity from "../activityLoading/types/Activity";

function _countDiscoverableCharacters(directReferencedCharacters:readonly Character[]):number {
  let count = 0;
  directReferencedCharacters.forEach(character => {
    if (isCharacterInteractive(character)) ++count;
  });
  return count;
}

// An item should be counted as discoverable if it's interactive and...
//  in a room OR
//  in a character's left/right hand OR
//  in character inventory and referenced in itinerary
function _countDiscoverableItems(directReferencedCharacters:readonly Character[], rooms:readonly Room[], activities:readonly Activity[]):number {
  const countedItemIds = new Set<string>();
  const activityReferencedItemIds = new Set<string>();

  activities.forEach(activity => {
    const itemId = activity.parts.itemId;
    const toItemId = activity.parts.toItemId;
    if (typeof itemId === 'string') activityReferencedItemIds.add(itemId);
    if (typeof toItemId === 'string') activityReferencedItemIds.add(toItemId);
  });

  directReferencedCharacters.forEach(character => {
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

export function findDiscoverableCounts(level:Level, activities:readonly Activity[]):{discoverableCharacterCount:number, discoverableItemCount:number, discoverableRoomCount:number} {
  const discoverableCharacterCount = _countDiscoverableCharacters(level.characters);
  const discoverableItemCount = _countDiscoverableItems(level.characters, level.rooms, activities);
  const discoverableRoomCount = level.rooms.length;
  return { discoverableCharacterCount, discoverableItemCount, discoverableRoomCount };
}