import { assertNonNullable } from "decent-portal";

import { createTakeItemEvent } from "../itineraryUtil";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import { AuthoredActivityContext, ensureTimestampIsAvailable, findCurrentRoom, findRoomItemById, planMovementToPosition, scheduleEventsToEndAtTime, stripTrailingPeriod } from "./activityUtil";

const TAKE_ITEM_NEARBY_DISTANCE = 8;

function _calcDistance(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.hypot(toX - fromX, toY - fromY);
}

export function tryCreateTakeActivity(activityText:string, context:AuthoredActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('takes ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText);
  const itemRef = stripTrailingPeriod(trimmedActivityText.slice('takes'.length).trim());
  if (!itemRef.length) throw new Error(`missing item id in authored activity '${activityText}'`);

  const itemLocation = findRoomItemById(context.roomItemsByRoomId, context.level, itemRef);
  if (!itemLocation) throw new Error(`item ${itemRef} is not available for authored take activity`);

  const currentRoom = findCurrentRoom(context.level, context.state.position);
  const isNearby = currentRoom.id === itemLocation.room.id
    && _calcDistance(context.state.position.x, context.state.position.y, itemLocation.item.position.x, itemLocation.item.position.y) <= TAKE_ITEM_NEARBY_DISTANCE;
  const unscheduledMovementEvents = isNearby ? [] : planMovementToPosition(context.level, context.state.position, itemLocation.item.position);
  const movementEvents = scheduleEventsToEndAtTime(unscheduledMovementEvents, context.timestamp, context.state.time);
  const roomItems = context.roomItemsByRoomId.get(itemLocation.room.id);
  assertNonNullable(roomItems, `missing room items for ${itemLocation.room.id}`);
  const itemIndex = roomItems.findIndex(item => item.id === itemLocation.item.id);
  if (itemIndex === -1) throw new Error(`item ${itemRef} is no longer available for authored take activity`);
  const [item] = roomItems.splice(itemIndex, 1);
  assertNonNullable(item, `expected item ${itemRef} to be removable`);
  context.state.carriedItems.push(item);
  return [...movementEvents, createTakeItemEvent(context.timestamp, item.id)];
}
