/* This module groups standing, sitting, kneeling, and laying activity parsing for itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import type { BodyOrientation } from "@/game/types/Character";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createBodyOrientationEvent } from "@/game/itineraryUtil";
import Item from "@/game/types/Item";
import WalkEvent from "@/game/types/itineraryEvents/WalkEvent";
import { findNearestWaypointToPosition } from "@/game/waypointUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { findCurrentRoom } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable, findEarliestAbsoluteActivityStartTime, scheduleEventsToStartAtTime } from "./activity/activitySchedulingUtil";
import { planMovementWithinRoom } from "./activity/activityMovementUtil";
import { findRoomItemById } from "./activity/activityTargetingUtil";
import { findSentenceStyleActivityVerb, stripTrailingPeriod } from "./activity/activityTextParseUtil";

type BodyOrientationVerb = 'stands' | 'sits' | 'kneels' | 'lays';

type ParsedBodyOrientationParts = {
  bodyOrientation:BodyOrientation,
  itemRef:string|null
};

function _findBodyOrientation(verb:BodyOrientationVerb):BodyOrientation {
  switch (verb) {
    case 'stands': return 'standing';
    case 'sits': return 'sitting';
    case 'kneels': return 'kneeling';
    case 'lays': return 'laying';
  }
}

function _parseBodyOrientationParts(activityText:string, verb:BodyOrientationVerb):ParsedBodyOrientationParts {
  const trimmedActivityText = stripTrailingPeriod(activityText.trim());
  if (trimmedActivityText === verb) return { bodyOrientation:_findBodyOrientation(verb), itemRef:null };

  const contentText = trimmedActivityText.slice(verb.length).trim();
  if (!contentText.startsWith('on ')) throw new Error(`unexpected extra text in authored activity '${activityText}'`);

  const itemRef = contentText.slice('on '.length).trim();
  if (!itemRef.length) throw new Error(`missing item id in authored activity '${activityText}'`);
  return { bodyOrientation:_findBodyOrientation(verb), itemRef };
}

function _findItemFloorPosition(roomItems:Item[], item:Item):Item['position'] {
  const stackedItems = roomItems.filter(candidate => candidate.position.x === item.position.x && candidate.position.z === item.position.z);
  const floorY = stackedItems.reduce((currentFloorY, candidate) => Math.max(currentFloorY, candidate.position.y), item.position.y);
  return {
    x:item.position.x,
    y:floorY,
    z:item.position.z
  };
}

export function tryCreateBodyOrientationActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const verb = findSentenceStyleActivityVerb(activityText, ['stands', 'sits', 'kneels', 'lays'] as const);
  if (!verb) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const { bodyOrientation, itemRef } = _parseBodyOrientationParts(activityText, verb);
  if (!itemRef) return [createBodyOrientationEvent(activityStartTime, bodyOrientation)];

  const currentRoom = findCurrentRoom(context.level, context.state.position);
  const roomItemLocation = findRoomItemById(context.roomItemsByRoomId, context.level, itemRef);
  if (!roomItemLocation || roomItemLocation.room.id !== currentRoom.id) {
    throw new Error(`item ${itemRef} is not available for body orientation activity`);
  }

  const roomItems = context.roomItemsByRoomId.get(currentRoom.id) || [];
  const targetPosition = _findItemFloorPosition(roomItems, roomItemLocation.item);
  const targetWaypoint = findNearestWaypointToPosition(currentRoom, targetPosition);
  const unscheduledMovementEvents = targetWaypoint === context.state.waypoint
    ? []
    : planMovementWithinRoom(currentRoom, context.state.waypoint, targetWaypoint);
  const scheduledWalkEvents = scheduleEventsToStartAtTime(unscheduledMovementEvents, activityStartTime,
    context.timestampType === 'absolute' ? findEarliestAbsoluteActivityStartTime(context.state) : context.state.time);
  const bodyOrientationEventTime = scheduledWalkEvents.length
    ? (() => {
      const lastWalkEvent = scheduledWalkEvents[scheduledWalkEvents.length - 1] as WalkEvent;
      return lastWalkEvent.startTime + lastWalkEvent.duration;
    })()
    : activityStartTime;
  return [...scheduledWalkEvents, createBodyOrientationEvent(bodyOrientationEventTime, bodyOrientation)];
}