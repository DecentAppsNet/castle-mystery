/* This module groups give-activity parsing and nearby-recipient movement planning during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { createGiveItemEvent } from "@/game/itineraryUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import WalkEvent from "@/game/types/itineraryEvents/WalkEvent";
import { findNearestWaypointToPosition, FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z } from "@/game/waypointUtil";
import { normalizeId } from "@/game/idUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { addStateOwnedItem, findCurrentRoom, removeStateOwnedItem } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable, findEarliestAbsoluteActivityStartTime, scheduleEventsToStartAtTime } from "./activity/activitySchedulingUtil";
import { findWaypointPath, planMovementWithinRoom } from "./activity/activityMovementUtil";
import { findTargetPositionAtTime } from "./activity/activityTargetingUtil";
import { stripTrailingPeriod } from "./activity/activityTextParseUtil";

const GIVE_ITEM_NEARBY_DISTANCE = 8;

function _calcFloorDistance(fromX:number, fromZ:number, toX:number, toZ:number):number {
  return Math.hypot(toX - fromX, toZ - fromZ);
}

function _isOnSameFloorY(y1:number, y2:number):boolean {
  return Math.abs(y1 - y2) <= FLOOR_WAYPOINT_Y_OFFSET;
}

function _isPreferredGiveWaypoint(waypoint:{ position:{ y:number, z:number } }, recipientPosition:{ y:number }):boolean {
  return _isOnSameFloorY(waypoint.position.y, recipientPosition.y) && waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z;
}

function _parseGiveParts(activityText:string):{ itemRef:string, recipientId:string } {
  const giveText = activityText.trim().slice('gives'.length).trim();
  const separatorIndex = giveText.lastIndexOf(' to ');
  if (separatorIndex <= 0 || separatorIndex >= giveText.length - ' to '.length) {
    throw new Error(`missing item or recipient in itinerary activity '${activityText}'`);
  }

  const itemRef = stripTrailingPeriod(giveText.slice(0, separatorIndex).trim());
  const recipientId = normalizeId(stripTrailingPeriod(giveText.slice(separatorIndex + ' to '.length).trim()));
  if (!itemRef || !recipientId) throw new Error(`missing item or recipient in itinerary activity '${activityText}'`);
  return { itemRef, recipientId };
}

export function tryCreateGiveActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('gives ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const { itemRef, recipientId } = _parseGiveParts(trimmedActivityText);
  const recipientCharacter = context.charactersById.get(recipientId) || null;
  if (!recipientCharacter) throw new Error(`unknown recipient '${recipientId}' in itinerary activity '${activityText}'`);
  const recipientState = context.characterStatesById.get(recipientId);
  assertNonNullable(recipientState, `missing itinerary state for ${recipientId}`);

  const currentRoom = findCurrentRoom(context.level, context.state.position);
  const recipientPosition = findTargetPositionAtTime(recipientId, activityStartTime,
    context.charactersById, context.characterStatesById, context.roomItemsByRoomId, context.poseOverridesByCharacterId);
  assertNonNullable(recipientPosition, `unable to resolve recipient '${recipientId}' for give activity`);
  const recipientRoom = findCurrentRoom(context.level, recipientPosition);
  if (recipientRoom.id !== currentRoom.id) throw new Error(`recipient ${recipientId} is not in the same room for give activity`);

  const isNearby = _calcFloorDistance(context.state.position.x, context.state.position.z, recipientPosition.x, recipientPosition.z) <= GIVE_ITEM_NEARBY_DISTANCE;
  const recipientWaypoint = findNearestWaypointToPosition(currentRoom, recipientPosition,
    waypoint => _isPreferredGiveWaypoint(waypoint, recipientPosition));
  const targetWaypoint = (() => {
    try {
      return findNearestWaypointToPosition(currentRoom, recipientPosition,
        waypoint => _isPreferredGiveWaypoint(waypoint, recipientPosition) && waypoint !== recipientWaypoint);
    } catch {
      return recipientWaypoint;
    }
  })();
  const unscheduledMovementEvents = isNearby || targetWaypoint === context.state.waypoint ? [] : (() => {
    findWaypointPath(currentRoom, context.state.waypoint, targetWaypoint);
    return planMovementWithinRoom(currentRoom, context.state.waypoint, targetWaypoint);
  })();
  const scheduledWalkEvents = scheduleEventsToStartAtTime(unscheduledMovementEvents, activityStartTime,
    context.timestampType === 'absolute' ? findEarliestAbsoluteActivityStartTime(context.state) : context.state.time);
  const giveEventTime = scheduledWalkEvents.length
    ? (() => {
      const lastWalkEvent = scheduledWalkEvents[scheduledWalkEvents.length - 1] as WalkEvent;
      return lastWalkEvent.startTime + lastWalkEvent.duration;
    })()
    : activityStartTime;

  const item = removeStateOwnedItem(context.state, itemRef);
  if (!item) throw new Error(`item ${itemRef} is not carried for give activity`);
  assertNonNullable(item, `expected item ${itemRef} to be removable`);
  addStateOwnedItem(recipientState, item, 'inventory');

  return [...scheduledWalkEvents, createGiveItemEvent(giveEventTime, item.id, recipientId)];
}
