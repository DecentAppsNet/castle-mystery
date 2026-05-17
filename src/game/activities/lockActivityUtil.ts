import ExitType from "../types/ExitType";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import WalkEvent from "../types/itineraryEvents/WalkEvent";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import { createLockEvent, createUnlockEvent } from "../itineraryUtil";
import { findExitWaypoint, findRoom } from "../roomUtil";
import {
  ActivityContext,
  calcActivityStartTime,
  ensureTimestampIsAvailable,
  findCurrentRoom,
  findEarliestAbsoluteActivityStartTime,
  planMovementWithinRoom,
  scheduleEventsToStartAtTime,
  stripTrailingPeriod
} from "./activityUtil";

const LOCK_EXIT_NEARBY_DISTANCE = 8;

function _calcDistance(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.hypot(toX - fromX, toY - fromY);
}

function _isLockableFromRoom(exit:RoomExit, room:Room):boolean {
  if (exit.room1Id === room.id) return exit.isLockableFromRoom1;
  if (exit.room2Id === room.id) return exit.isLockableFromRoom2;
  return false;
}

function _findCurrentRoomExit(currentRoom:Room, targetRoomRef:string, context:ActivityContext):RoomExit {
  const targetRoom = findRoom(context.level.rooms, targetRoomRef);
  const exit = currentRoom.exits.find(candidate => candidate.room1Id === targetRoom.id || candidate.room2Id === targetRoom.id) || null;
  if (!exit) throw new Error(`room ${targetRoomRef} is not connected to ${currentRoom.title} for itinerary activity`);
  if (exit.exitType !== ExitType.lockableDoor) throw new Error(`exit to ${targetRoomRef} is not lockable for itinerary activity`);
  if (!_isLockableFromRoom(exit, currentRoom)) {
    throw new Error(`exit to ${targetRoomRef} cannot be locked or unlocked from ${currentRoom.title}`);
  }
  return exit;
}

function _createLockChangeActivity(activityText:string, verb:'locks'|'unlocks', context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith(`${verb} `)) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const roomRef = stripTrailingPeriod(trimmedActivityText.slice(verb.length).trim());
  if (!roomRef.length) throw new Error(`missing room id in itinerary activity '${activityText}'`);

  const currentRoom = findCurrentRoom(context.level, context.state.position);
  const exit = _findCurrentRoomExit(currentRoom, roomRef, context);
  const exitWaypoint = findExitWaypoint(currentRoom.id, currentRoom.rect, exit, currentRoom.waypoints);
  const isNearby = _calcDistance(context.state.position.x, context.state.position.y,
    exitWaypoint.position.x, exitWaypoint.position.y) <= LOCK_EXIT_NEARBY_DISTANCE;
  const unscheduledMovementEvents = isNearby ? [] : planMovementWithinRoom(currentRoom, context.state.waypoint, exitWaypoint);
  const scheduledWalkEvents = scheduleEventsToStartAtTime(unscheduledMovementEvents, activityStartTime,
    context.timestampKind === 'absolute' ? findEarliestAbsoluteActivityStartTime(context.state) : context.state.time);
  const eventTime = scheduledWalkEvents.length
    ? (() => {
      const lastWalkEvent = scheduledWalkEvents[scheduledWalkEvents.length - 1] as WalkEvent;
      return lastWalkEvent.startTime + lastWalkEvent.duration;
    })()
    : activityStartTime;
  return [...scheduledWalkEvents, verb === 'locks' ? createLockEvent(eventTime, exit.id) : createUnlockEvent(eventTime, exit.id)];
}

export function tryCreateLockActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  return _createLockChangeActivity(activityText, 'locks', context);
}

export function tryCreateUnlockActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  return _createLockChangeActivity(activityText, 'unlocks', context);
}