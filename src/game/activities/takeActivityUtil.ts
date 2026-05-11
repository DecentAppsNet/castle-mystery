import { assertNonNullable } from "decent-portal";

import { createTakeItemEvent } from "../itineraryUtil";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import WalkEvent from "../types/itineraryEvents/WalkEvent";
import { ActivityContext, addFacingEventsForWalks, calcActivityStartTime, createWaypointKey, ensureTimestampIsAvailable, findCurrentRoom, findRoomItemById, findWaypointPath, planMovementWithinRoom, scheduleEventsToEndAtTime, scheduleEventsToStartAtTime, stripTrailingPeriod } from "./activityUtil";
import { findNearestWaypoint } from "../roomUtil";

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
  const occupiedWaypointKeys = new Set(Array.from(context.characterStatesById.entries())
    .filter(([characterId]) => characterId !== context.character.id)
    .filter(([, state]) => findCurrentRoom(context.level, state.waypoint.position).id === currentRoom.id)
    .map(([, state]) => createWaypointKey(state.waypoint)));
  const targetWaypoint = findNearestWaypoint(currentRoom, itemLocation.item.position.x, itemLocation.item.position.y,
    waypoint => !occupiedWaypointKeys.has(createWaypointKey(waypoint)));
  if (_calcDistance(targetWaypoint.position.x, targetWaypoint.position.y, itemLocation.item.position.x, itemLocation.item.position.y) > TAKE_ITEM_NEARBY_DISTANCE) {
    throw new Error(`item ${itemRef} is not near any unclaimed waypoint for take activity`);
  }
  const unscheduledMovementEvents = isNearby ? [] : (() => {
    findWaypointPath(currentRoom, context.state.waypoint, targetWaypoint);
    return planMovementWithinRoom(currentRoom, context.state.waypoint, targetWaypoint);
  })();
  const scheduledWalkEvents = context.timestampKind === 'absolute'
    ? scheduleEventsToEndAtTime(unscheduledMovementEvents, context.timestamp, context.state.time)
    : scheduleEventsToStartAtTime(unscheduledMovementEvents, activityStartTime, context.state.time);
  const movementEvents = addFacingEventsForWalks(context.character, context.state, scheduledWalkEvents);
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
  return [...movementEvents, createTakeItemEvent(takeEventTime, item.id)];
}
