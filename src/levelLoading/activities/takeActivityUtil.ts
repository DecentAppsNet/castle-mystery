import { assertNonNullable } from "decent-portal";

import { createTakeItemEvent } from "@/game/itineraryUtil";
import { findNearestWaypointToPosition } from "@/game/waypointUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import WalkEvent from "@/game/types/itineraryEvents/WalkEvent";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, findCurrentRoom, findEarliestAbsoluteActivityStartTime, findRoomItemById, findWaypointPath, planMovementWithinRoom, scheduleEventsToStartAtTime, stripTrailingPeriod } from "./activityUtil";

const TAKE_ITEM_NEARBY_DISTANCE = 8;

function _calcDistance(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.hypot(toX - fromX, toY - fromY);
}

export function tryCreateTakeActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('takes ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const itemRef = stripTrailingPeriod(trimmedActivityText.slice('takes'.length).trim());
  if (!itemRef.length) throw new Error(`missing item id in itinerary activity '${activityText}'`);

  const itemLocation = findRoomItemById(context.roomItemsByRoomId, context.level, itemRef);
  if (!itemLocation) throw new Error(`item ${itemRef} is not available for take activity`);

  const currentRoom = findCurrentRoom(context.level, context.state.position);
  if (currentRoom.id !== itemLocation.room.id) throw new Error(`item ${itemRef} is not in the same room for take activity`);
  const isNearby = currentRoom.id === itemLocation.room.id
    && _calcDistance(context.state.position.x, context.state.position.y, itemLocation.item.position.x, itemLocation.item.position.y) <= TAKE_ITEM_NEARBY_DISTANCE;
  const targetWaypoint = findNearestWaypointToPosition(currentRoom, itemLocation.item.position);
  const unscheduledMovementEvents = isNearby ? [] : (() => {
    findWaypointPath(currentRoom, context.state.waypoint, targetWaypoint);
    return planMovementWithinRoom(currentRoom, context.state.waypoint, targetWaypoint);
  })();
  const scheduledWalkEvents = scheduleEventsToStartAtTime(unscheduledMovementEvents, activityStartTime,
    context.timestampKind === 'absolute' ? findEarliestAbsoluteActivityStartTime(context.state) : context.state.time);
  const takeEventTime = scheduledWalkEvents.length
    ? (() => {
      const lastWalkEvent = scheduledWalkEvents[scheduledWalkEvents.length - 1] as WalkEvent;
      return lastWalkEvent.startTime + lastWalkEvent.duration;
    })()
    : activityStartTime;
  const roomItems = context.roomItemsByRoomId.get(itemLocation.room.id);
  assertNonNullable(roomItems, `missing room items for ${itemLocation.room.id}`);
  const itemIndex = roomItems.findIndex(item => item.id === itemLocation.item.id);
  if (itemIndex === -1) throw new Error(`item ${itemRef} is no longer available for take activity`);
  const [item] = roomItems.splice(itemIndex, 1);
  assertNonNullable(item, `expected item ${itemRef} to be removable`);
  context.state.carriedItems.push(item);
  return [...scheduledWalkEvents, createTakeItemEvent(takeEventTime, item.id)];
}
