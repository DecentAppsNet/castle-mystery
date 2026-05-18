import Item from "@/game/types/Item";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createDropItemEvent } from "@/game/itineraryUtil";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, findCurrentRoom, stripTrailingPeriod } from "./activityUtil";
import { normalizeId } from "@/game/idUtil";

function _matchesItemReference(item:Item, reference:string):boolean {
  const normalizedReference = normalizeId(reference);
  return item.id === normalizedReference || normalizeId(item.title) === normalizedReference;
}

export function tryCreateDropActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('drops ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const itemRef = stripTrailingPeriod(trimmedActivityText.slice('drops'.length).trim());
  if (!itemRef.length) throw new Error(`missing item id in itinerary activity '${activityText}'`);

  const itemIndex = context.state.carriedItems.findIndex(candidate => _matchesItemReference(candidate, itemRef));
  if (itemIndex === -1) throw new Error(`item ${itemRef} is not carried for drop activity`);
  const [item] = context.state.carriedItems.splice(itemIndex, 1);
  if (!item) throw new Error(`item ${itemRef} is no longer carried for drop activity`);

  const droppedItem = {
    ...item,
    position:{ ...context.state.waypoint.position }
  };
  const room = findCurrentRoom(context.level, context.state.position);
  const roomItems = context.roomItemsByRoomId.get(room.id) || null;
  if (!roomItems) throw new Error(`missing room items for drop activity '${activityText}'`);
  roomItems.push(droppedItem);

  return [createDropItemEvent(activityStartTime, droppedItem.id, droppedItem.position)];
}
