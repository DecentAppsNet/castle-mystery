import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import Position from "../types/Position";
import { findRoom } from "../roomUtil";
import { ActivityContext, addFacingEventsForWalks, calcActivityStartTime, ensureTimestampIsAvailable, findCurrentRoom, planMovementToRoom, scheduleEventsToEndAtTime, scheduleEventsToStartAtTime } from "./activityUtil";

function _parseAtTarget(activityText:string, context:ActivityContext):{ roomId:string, targetPosition:Position|null } {
  const targetText = activityText.trim().slice(1).trim();
  if (!targetText) throw new Error(`missing room id in authored activity '${activityText}'`);

  const exactRoom = context.level.rooms.find(room => room.id === targetText) || null;
  if (exactRoom) return { roomId:exactRoom.id, targetPosition:null };

  const separatorIndex = targetText.lastIndexOf('.');
  if (separatorIndex <= 0 || separatorIndex === targetText.length - 1) {
    throw new Error(`unknown room id '${targetText}' in authored activity '${activityText}'`);
  }

  const roomId = targetText.slice(0, separatorIndex).trim();
  const markerId = targetText.slice(separatorIndex + 1).trim();
  if (!roomId || !markerId) throw new Error(`missing room or marker id in authored activity '${activityText}'`);
  const room = findRoom(context.level.rooms, roomId);
  const markerPosition = room.positionMarkersById[markerId];
  if (!markerPosition) throw new Error(`unknown position marker ${roomId}.${markerId}`);
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
  const unscheduledEvents = planMovementToRoom(context.level, context.state.waypoint, targetRoomId, occupiedWaypointKeys, targetPosition);
  const scheduledEvents = context.timestampKind === 'absolute'
    ? scheduleEventsToEndAtTime(unscheduledEvents, context.timestamp, context.state.time)
    : scheduleEventsToStartAtTime(unscheduledEvents, activityStartTime, context.state.time);
  return addFacingEventsForWalks(context.character, context.state,
    scheduledEvents);
}
