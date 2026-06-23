/* This module groups authored `@ room` activity parsing and event creation during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { findNearestWaypointToPosition } from "@/game/waypointUtil";
import { normalizeId } from "@/game/idUtil";
import { formatMsecsAsTimestamp } from "@/levelLoading/timestampUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { findCurrentRoomForWaypoint } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable, findEarliestAbsoluteActivityStartTime, scheduleEventsToEndAtTime, scheduleEventsToStartAtTime } from "./activity/activitySchedulingUtil";
import { planMovementToRoom } from "./activity/activityMovementUtil";
import { stripTrailingPeriod } from "./activity/activityTextParseUtil";

function _createWaypointKey(position:{ x:number, y:number, z:number }):string {
  return `${position.x},${position.y},${position.z}`;
}

function _createClaimedWaypointKeysForTargetRoom(targetRoomId:string, context:ActivityContext):Set<string> {
  const claimedWaypointKeys = new Set<string>();
  const targetRoom = context.level.rooms.find(room => room.id === targetRoomId) || null;
  if (!targetRoom) return claimedWaypointKeys;

  Array.from(context.characterStatesById.entries())
    .filter(([characterId]) => characterId !== context.character.id)
    .filter(([, state]) => state.isVisible)
    .filter(([, state]) => findCurrentRoomForWaypoint(context.level, state.waypoint).id === targetRoomId)
    .forEach(([, state]) => claimedWaypointKeys.add(_createWaypointKey(state.waypoint.position)));

  const roomItems = context.roomItemsByRoomId.get(targetRoomId) || [];
  roomItems
    .filter(item => item.isVisible)
    .forEach(item => claimedWaypointKeys.add(_createWaypointKey(findNearestWaypointToPosition(targetRoom, item.position).position)));

  return claimedWaypointKeys;
}

function _parseRoomPercentTarget(targetText:string):number|null {
  if (!targetText.endsWith('%')) return null;
  const percentText = targetText.slice(0, -1).trim();
  if (!/^\d+$/.test(percentText)) throw new Error(`invalid room percent target '${targetText}'`);
  const targetPercent = Number(percentText);
  if (!Number.isInteger(targetPercent) || targetPercent < 0 || targetPercent > 100) {
    throw new Error(`invalid room percent target '${targetText}'`);
  }
  return targetPercent;
}

function _parseAtTarget(activityText:string, context:ActivityContext):{ roomId:string, targetXPercent:number|null } {
  const targetText = stripTrailingPeriod(activityText.trim().slice(1).trim());
  if (!targetText) throw new Error(`missing room id in authored activity '${activityText}'`);

  const percentOnlyTarget = !targetText.includes('.') ? _parseRoomPercentTarget(targetText) : null;
  if (percentOnlyTarget !== null) {
    return {
      roomId:findCurrentRoomForWaypoint(context.level, context.state.waypoint).id,
      targetXPercent:percentOnlyTarget
    };
  }

  const targetId = normalizeId(targetText);
  const exactRoom = context.level.rooms.find(room => room.id === targetId) || null;
  if (exactRoom) return { roomId:exactRoom.id, targetXPercent:null };

  const separatorIndex = targetText.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === targetText.length - 1) {
    throw new Error(`unknown room id '${targetText}' in authored activity '${activityText}'`);
  }

  const authoredRoomText = targetText.slice(0, separatorIndex).trim();
  const authoredPercentText = targetText.slice(separatorIndex + 1).trim();
  const roomId = normalizeId(authoredRoomText);
  const targetXPercent = _parseRoomPercentTarget(authoredPercentText);
  if (!roomId || targetXPercent === null) throw new Error(`unknown room id '${targetText}' in authored activity '${activityText}'`);
  return { roomId, targetXPercent };
}

export function tryCreateAtActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('@')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const { roomId:targetRoomId, targetXPercent } = _parseAtTarget(trimmedActivityText, context);
  if (findCurrentRoomForWaypoint(context.level, context.state.waypoint).id === targetRoomId && targetXPercent === null) return [];
  const occupiedWaypointKeys = _createClaimedWaypointKeysForTargetRoom(targetRoomId, context);
  const unscheduledEvents = planMovementToRoom(context.level, context.state.waypoint, targetRoomId, occupiedWaypointKeys, null, targetXPercent);
  const targetRoomTitle = context.level.rooms.find(room => room.id === targetRoomId)?.title || targetRoomId;
  const scheduledEvents = context.timestampType === 'absolute'
    ? scheduleEventsToEndAtTime(unscheduledEvents, context.timestamp, findEarliestAbsoluteActivityStartTime(context.state), earliestArrivalTime =>
      `Unable to arrive to ${targetRoomTitle} by ${formatMsecsAsTimestamp(context.timestamp)}. The earliest possible arrival is ${formatMsecsAsTimestamp(earliestArrivalTime)}.`)
    : scheduleEventsToStartAtTime(unscheduledEvents, activityStartTime, context.state.time);
  return scheduledEvents;
}
