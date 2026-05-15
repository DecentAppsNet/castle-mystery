import { createWalkEvent, findRoomAtPositionOrNearest } from "../itineraryUtil";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, stripTrailingPeriod } from "./activityUtil";

function _calcStableActivityHash(activitySourceIndex:number, characterId:string):number {
  let hash = activitySourceIndex + 1;
  for (const char of characterId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function tryCreateWanderActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  if (stripTrailingPeriod(activityText) !== 'wanders') return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const room = findRoomAtPositionOrNearest(context.level.rooms,
    context.state.waypoint.position.x, context.state.waypoint.position.y);
  const occupiedWaypointKeys = new Set(Array.from(context.characterStatesById.entries())
    .filter(([characterId]) => characterId !== context.character.id)
    .map(([, state]) => `${state.waypoint.position.x},${state.waypoint.position.y}`));
  const availableWaypoints = context.state.waypoint.adjacentWaypoints
    .filter(waypoint => !occupiedWaypointKeys.has(`${waypoint.position.x},${waypoint.position.y}`));
  const candidateResults = availableWaypoints.map(waypoint => ({
    waypoint,
    result: createWalkEvent(room, context.timestamp, context.state.waypoint.position.x, context.state.waypoint.position.y,
      waypoint.position.x, waypoint.position.y)
  })).filter(candidate => candidate.result.event && !candidate.result.wasClipped);
  if (!candidateResults.length) {
    throw new Error(`unable to create wander activity for ${context.character.id}: no reachable unclaimed adjacent waypoint`);
  }
  const selectedCandidate = candidateResults[_calcStableActivityHash(context.activitySourceIndex, context.character.id) % candidateResults.length];
  const shiftedWalkEvent = { ...selectedCandidate.result.event!, startTime:activityStartTime };
  return [shiftedWalkEvent];
}
