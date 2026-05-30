import { assertNonNullable } from "decent-portal";

import { createGiveItemEvent } from "@/game/itineraryUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import WalkEvent from "@/game/types/itineraryEvents/WalkEvent";
import { findNearestWaypointToPosition } from "@/game/waypointUtil";
import {
  ActivityContext,
  calcActivityStartTime,
  ensureTimestampIsAvailable,
  findEarliestAbsoluteActivityStartTime,
  findCurrentRoom,
  findTargetPositionAtTime,
  findWaypointPath,
  planMovementWithinRoom,
  scheduleEventsToStartAtTime,
  stripTrailingPeriod
} from "./activityUtil";
import { normalizeId } from "@/game/idUtil";

const GIVE_ITEM_NEARBY_DISTANCE = 8;

function _calcDistance(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.hypot(toX - fromX, toY - fromY);
}

function _matchesItemReference(itemId:string, itemTitle:string, reference:string):boolean {
  const normalizedReference = normalizeId(reference);
  return itemId === normalizedReference || normalizeId(itemTitle) === normalizedReference;
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

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
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

  const isNearby = _calcDistance(context.state.position.x, context.state.position.y, recipientPosition.x, recipientPosition.y) <= GIVE_ITEM_NEARBY_DISTANCE;
  const targetWaypoint = findNearestWaypointToPosition(currentRoom, recipientPosition);
  const unscheduledMovementEvents = isNearby ? [] : (() => {
    findWaypointPath(currentRoom, context.state.waypoint, targetWaypoint);
    return planMovementWithinRoom(currentRoom, context.state.waypoint, targetWaypoint);
  })();
  const scheduledWalkEvents = scheduleEventsToStartAtTime(unscheduledMovementEvents, activityStartTime,
    context.timestampKind === 'absolute' ? findEarliestAbsoluteActivityStartTime(context.state) : context.state.time);
  const giveEventTime = scheduledWalkEvents.length
    ? (() => {
      const lastWalkEvent = scheduledWalkEvents[scheduledWalkEvents.length - 1] as WalkEvent;
      return lastWalkEvent.startTime + lastWalkEvent.duration;
    })()
    : activityStartTime;

  const itemIndex = context.state.carriedItems.findIndex(item => _matchesItemReference(item.id, item.title, itemRef));
  if (itemIndex === -1) throw new Error(`item ${itemRef} is not carried for give activity`);
  const [item] = context.state.carriedItems.splice(itemIndex, 1);
  assertNonNullable(item, `expected item ${itemRef} to be removable`);
  recipientState.carriedItems.push(item);

  return [...scheduledWalkEvents, createGiveItemEvent(giveEventTime, item.id, recipientId)];
}
