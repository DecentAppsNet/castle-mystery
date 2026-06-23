/* This module groups lock and unlock activity parsing with exit-target movement planning during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { getOwnedItems } from "@/game/itemOwnershipUtil";
import ExitType from "@/game/types/ExitType";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import WalkEvent from "@/game/types/itineraryEvents/WalkEvent";
import Room from "@/game/types/Room";
import RoomExit, { LOCKABLE_WITHOUT_INV_CHECK } from "@/game/types/RoomExit";
import { createLockEvent, createUnlockEvent } from "@/game/itineraryUtil";
import { findRoom } from "@/game/roomUtil";
import { findExitWaypoint } from "@/game/waypointUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { findCurrentRoom } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable, findEarliestAbsoluteActivityStartTime, scheduleEventsToStartAtTime } from "./activity/activitySchedulingUtil";
import { planMovementWithinRoom } from "./activity/activityMovementUtil";
import { stripTrailingPeriod } from "./activity/activityTextParseUtil";

const LOCK_EXIT_NEARBY_DISTANCE = 8;

function _calcDistance(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.hypot(toX - fromX, toY - fromY);
}

function _isLockableFromRoom(exit:RoomExit, room:Room):boolean {
  if (exit.room1Id === room.id) return exit.lockableFromRoom1With !== null;
  if (exit.room2Id === room.id) return exit.lockableFromRoom2With !== null;
  return false;
}

function _findLockableRequirementForRoom(exit:RoomExit, room:Room):string|null {
  if (exit.room1Id === room.id) return exit.lockableFromRoom1With;
  if (exit.room2Id === room.id) return exit.lockableFromRoom2With;
  return null;
}

function _throwIfRequiredLockItemIsMissing(exit:RoomExit, currentRoom:Room, context:ActivityContext, targetRoomRef:string) {
  const lockableRequirement = _findLockableRequirementForRoom(exit, currentRoom);
  if (lockableRequirement === null || lockableRequirement === LOCKABLE_WITHOUT_INV_CHECK) return;
  if (getOwnedItems(context.state).some(item => item.id === lockableRequirement)) return;
  throw new Error(`exit to ${targetRoomRef} requires item ${lockableRequirement} to be carried for itinerary activity`);
}

function _findCurrentRoomExit(currentRoom:Room, targetRoomRef:string, context:ActivityContext):RoomExit {
  const targetRoom = findRoom(context.level.rooms, targetRoomRef);
  const exit = currentRoom.exits.find(candidate => candidate.room1Id === targetRoom.id || candidate.room2Id === targetRoom.id) || null;
  if (!exit) throw new Error(`room ${targetRoomRef} is not connected to ${currentRoom.title} for itinerary activity`);
  if (exit.exitType !== ExitType.lockableDoor) throw new Error(`exit to ${targetRoomRef} is not lockable for itinerary activity`);
  if (!_isLockableFromRoom(exit, currentRoom)) {
    throw new Error(`exit to ${targetRoomRef} cannot be locked or unlocked from ${currentRoom.title}`);
  }
  _throwIfRequiredLockItemIsMissing(exit, currentRoom, context, targetRoomRef);
  return exit;
}

function _createLockChangeActivity(activityText:string, verb:'locks'|'unlocks', context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith(`${verb} `)) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const roomRef = stripTrailingPeriod(trimmedActivityText.slice(verb.length).trim());
  if (!roomRef.length) throw new Error(`missing room id in itinerary activity '${activityText}'`);

  const currentRoom = findCurrentRoom(context.level, context.state.position);
  const exit = _findCurrentRoomExit(currentRoom, roomRef, context);
  const exitWaypoint = findExitWaypoint(currentRoom.id, currentRoom.rect, exit, currentRoom.waypoints);
  const isNearby = _calcDistance(context.state.position.x, context.state.position.y,
    exitWaypoint.position.x, exitWaypoint.position.y) <= LOCK_EXIT_NEARBY_DISTANCE;
  const unscheduledMovementEvents = isNearby ? [] : planMovementWithinRoom(currentRoom, context.state.waypoint, exitWaypoint);
  const scheduledWalkEvents = scheduleEventsToStartAtTime(unscheduledMovementEvents, activityStartTime,
    context.timestampType === 'absolute' ? findEarliestAbsoluteActivityStartTime(context.state) : context.state.time);
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