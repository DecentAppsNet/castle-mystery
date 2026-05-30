import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, findCurrentRoom, findEarliestAbsoluteActivityStartTime, planMovementToRoom, scheduleEventsToEndAtTime, scheduleEventsToStartAtTime, stripTrailingPeriod } from "./activityUtil";
import { normalizeId } from "@/game/idUtil";

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

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const { roomId:targetRoomId, targetXPercent } = _parseAtTarget(trimmedActivityText, context);
  if (findCurrentRoom(context.level, context.state.position).id === targetRoomId && targetXPercent === null) return [];
  const occupiedWaypointKeys = new Set(Array.from(context.characterStatesById.entries())
    .filter(([characterId]) => characterId !== context.character.id)
    .filter(([, state]) => findCurrentRoom(context.level, state.waypoint.position).id === targetRoomId)
    .map(([, state]) => `${state.waypoint.position.x},${state.waypoint.position.y},${state.waypoint.position.z}`));
  const unscheduledEvents = planMovementToRoom(context.level, context.state.waypoint, targetRoomId, occupiedWaypointKeys, null, targetXPercent);
  const scheduledEvents = context.timestampKind === 'absolute'
    ? scheduleEventsToEndAtTime(unscheduledEvents, context.timestamp, findEarliestAbsoluteActivityStartTime(context.state))
    : scheduleEventsToStartAtTime(unscheduledEvents, activityStartTime, context.state.time);
  return scheduledEvents;
}
