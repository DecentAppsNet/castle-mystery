/* This module groups take-activity parsing and item-target waypoint planning during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { createTakeItemEvent } from "@/game/itineraryUtil";
import Item from "@/game/types/Item";
import Waypoint from "@/game/types/Waypoint";
import { FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z } from "@/game/waypointUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import WalkEvent from "@/game/types/itineraryEvents/WalkEvent";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, findCurrentRoom, findEarliestAbsoluteActivityStartTime, findRoomItemById, findWaypointPath, planMovementWithinRoom, scheduleEventsToStartAtTime, stripTrailingPeriod } from "./activityUtil";

function _isExitWaypoint(room:ReturnType<typeof findCurrentRoom>, waypoint:Waypoint):boolean {
  return waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    && room.exits.some(exit => exit.x === waypoint.position.x && exit.y === waypoint.position.y);
}

function _isOrthogonalToFloorPosition(floorPosition:Item['position'], waypoint:Waypoint):boolean {
  const sameX = waypoint.position.x === floorPosition.x;
  const sameZ = waypoint.position.z === floorPosition.z;
  return (sameX || sameZ) && !(sameX && sameZ);
}

function _calcDistance(fromX:number, fromZ:number, toX:number, toZ:number):number {
  return Math.hypot(toX - fromX, toZ - fromZ);
}

function _findItemFloorY(roomItems:Item[], item:Item, room:ReturnType<typeof findCurrentRoom>):number {
  const stackedItems = roomItems.filter(candidate => candidate.position.x === item.position.x && candidate.position.z === item.position.z);
  if (!stackedItems.length) return room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  return stackedItems.reduce((floorY, candidate) => Math.max(floorY, candidate.position.y), stackedItems[0].position.y);
}

function _createItemFloorPosition(roomItems:Item[], item:Item, room:ReturnType<typeof findCurrentRoom>):Item['position'] {
  return {
    x:item.position.x,
    y:_findItemFloorY(roomItems, item, room),
    z:item.position.z
  };
}

function _scoreTakeWaypoint(room:ReturnType<typeof findCurrentRoom>, floorPosition:Item['position'], item:Item, waypoint:Waypoint):number|null {
  if (Math.abs(waypoint.position.y - floorPosition.y) > FLOOR_WAYPOINT_Y_OFFSET) return null;
  if (_isExitWaypoint(room, waypoint)) return null;

  let score = 0;
  if (_isOrthogonalToFloorPosition(floorPosition, waypoint)) score += 1000;
  if (waypoint.position.z > item.position.z) score += 500;
  score += 100 - _calcDistance(floorPosition.x, floorPosition.z, waypoint.position.x, waypoint.position.z);
  return score;
}

function _chooseBestTakeWaypoint(room:ReturnType<typeof findCurrentRoom>, item:Item, roomItems:Item[], currentWaypoint:Waypoint):Waypoint {
  const floorPosition = _createItemFloorPosition(roomItems, item, room);
  const scoredWaypoints = room.waypoints
    .map(waypoint => ({ waypoint, score:_scoreTakeWaypoint(room, floorPosition, item, waypoint) }))
    .filter((entry):entry is { waypoint:Waypoint, score:number } => entry.score !== null);
  if (!scoredWaypoints.length) return currentWaypoint;

  return scoredWaypoints.reduce((bestEntry, entry) => {
    if (entry.score !== bestEntry.score) return entry.score > bestEntry.score ? entry : bestEntry;
    if (entry.waypoint.position.x !== bestEntry.waypoint.position.x) {
      return entry.waypoint.position.x < bestEntry.waypoint.position.x ? entry : bestEntry;
    }
    if (entry.waypoint.position.z !== bestEntry.waypoint.position.z) {
      return entry.waypoint.position.z < bestEntry.waypoint.position.z ? entry : bestEntry;
    }
    if (entry.waypoint.position.y !== bestEntry.waypoint.position.y) {
      return entry.waypoint.position.y < bestEntry.waypoint.position.y ? entry : bestEntry;
    }
    return bestEntry;
  }).waypoint;
}

export function tryCreateTakeActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('takes ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const itemRef = stripTrailingPeriod(trimmedActivityText.slice('takes'.length).trim());
  if (!itemRef.length) throw new Error(`missing item id in itinerary activity '${activityText}'`);

  const itemLocation = findRoomItemById(context.roomItemsByRoomId, context.level, itemRef);
  if (!itemLocation) throw new Error(`item ${itemRef} is not available for take activity`);

  const currentRoom = findCurrentRoom(context.level, context.state.position);
  if (currentRoom.id !== itemLocation.room.id) throw new Error(`item ${itemRef} is not in the same room for take activity`);
  const roomItems = context.roomItemsByRoomId.get(itemLocation.room.id);
  assertNonNullable(roomItems, `missing room items for ${itemLocation.room.id}`);
  const targetWaypoint = _chooseBestTakeWaypoint(currentRoom, itemLocation.item, roomItems, context.state.waypoint);
  const unscheduledMovementEvents = targetWaypoint === context.state.waypoint ? [] : (() => {
    findWaypointPath(currentRoom, context.state.waypoint, targetWaypoint);
    return planMovementWithinRoom(currentRoom, context.state.waypoint, targetWaypoint);
  })();
  const scheduledWalkEvents = scheduleEventsToStartAtTime(unscheduledMovementEvents, activityStartTime,
    context.timestampType === 'absolute' ? findEarliestAbsoluteActivityStartTime(context.state) : context.state.time);
  const takeEventTime = scheduledWalkEvents.length
    ? (() => {
      const lastWalkEvent = scheduledWalkEvents[scheduledWalkEvents.length - 1] as WalkEvent;
      return lastWalkEvent.startTime + lastWalkEvent.duration;
    })()
    : activityStartTime;
  const itemIndex = roomItems.findIndex(item => item.id === itemLocation.item.id);
  if (itemIndex === -1) throw new Error(`item ${itemRef} is no longer available for take activity`);
  const [item] = roomItems.splice(itemIndex, 1);
  assertNonNullable(item, `expected item ${itemRef} to be removable`);
  context.state.carriedItems.push(item);
  return [...scheduledWalkEvents, createTakeItemEvent(takeEventTime, item.id)];
}
