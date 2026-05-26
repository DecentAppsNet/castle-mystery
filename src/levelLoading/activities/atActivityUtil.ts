import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import Position from "@/game/types/Position";
import { createWalkEvent } from "@/game/itineraryUtil";
import { findRoom } from "@/game/roomUtil";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, findCurrentRoom, findEarliestAbsoluteActivityStartTime, planMovementToRoom, scheduleEventsToEndAtTime, scheduleEventsToStartAtTime } from "./activityUtil";
import { normalizeId } from "@/game/idUtil";

function _parseAtTarget(activityText:string, context:ActivityContext):{ roomId:string, targetPosition:Position|null } {
  const targetText = activityText.trim().slice(1).trim();
  if (!targetText) throw new Error(`missing room id in authored activity '${activityText}'`);

  const targetId = normalizeId(targetText);
  const exactRoom = context.level.rooms.find(room => room.id === targetId) || null;
  if (exactRoom) return { roomId:exactRoom.id, targetPosition:null };

  const separatorIndex = targetText.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === targetText.length - 1) {
    throw new Error(`unknown room id '${targetText}' in authored activity '${activityText}'`);
  }

  const authoredRoomText = targetText.slice(0, separatorIndex).trim();
  const authoredMarkerText = targetText.slice(separatorIndex + 1).trim();
  const roomId = normalizeId(authoredRoomText);
  const markerId = normalizeId(authoredMarkerText);
  if (!roomId || !markerId) throw new Error(`missing room or marker id in authored activity '${activityText}'`);
  const room = findRoom(context.level.rooms, roomId);
  const markerPosition = room.positionMarkersById[markerId];
  if (!markerPosition) throw new Error(`unknown position marker ${authoredRoomText}.${authoredMarkerText}`);
  return { roomId, targetPosition:markerPosition };
}

export function tryCreateAtActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('@')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const { roomId:targetRoomId, targetPosition } = _parseAtTarget(trimmedActivityText, context);
  if (findCurrentRoom(context.level, context.state.position).id === targetRoomId && !targetPosition) return [];
  const occupiedWaypointKeys = new Set(Array.from(context.characterStatesById.entries())
    .filter(([characterId]) => characterId !== context.character.id)
    .filter(([, state]) => findCurrentRoom(context.level, state.waypoint.position).id === targetRoomId)
    .map(([, state]) => `${state.waypoint.position.x},${state.waypoint.position.y}`));
  const currentRoomId = findCurrentRoom(context.level, context.state.position).id;
  let unscheduledEvents = planMovementToRoom(context.level, context.state.waypoint, targetRoomId, occupiedWaypointKeys, targetPosition);
  if (!unscheduledEvents.length && targetPosition && currentRoomId === targetRoomId
    && (context.state.position.x !== targetPosition.x || context.state.position.y !== targetPosition.y)) {
    const currentRoom = findRoom(context.level.rooms, targetRoomId);
    const moveResult = createWalkEvent(currentRoom, 0, context.state.position.x, context.state.position.y,
      targetPosition.x, targetPosition.y);
    if (!moveResult.event || moveResult.wasClipped) throw new Error(`unable to reach marker in room ${targetRoomId}`);
    unscheduledEvents = [moveResult.event];
  }
  const scheduledEvents = context.timestampKind === 'absolute'
    ? scheduleEventsToEndAtTime(unscheduledEvents, context.timestamp, findEarliestAbsoluteActivityStartTime(context.state))
    : scheduleEventsToStartAtTime(unscheduledEvents, activityStartTime, context.state.time);
  return scheduledEvents;
}
