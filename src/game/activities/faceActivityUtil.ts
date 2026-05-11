import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import {
  ActivityContext,
  calcActivityStartTime,
  createFacingEventForTarget,
  ensureTimestampIsAvailable,
  findStatePoseAtTime,
  findTargetPositionAtTime,
  stripTrailingPeriod
} from "./activityUtil";

export function tryCreateFaceActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('faces ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const targetId = stripTrailingPeriod(trimmedActivityText.slice('faces'.length).trim());
  if (!targetId.length) throw new Error(`missing target id in itinerary activity '${activityText}'`);

  const targetPosition = findTargetPositionAtTime(
    targetId,
    activityStartTime,
    context.charactersById,
    context.characterStatesById,
    context.roomItemsByRoomId,
    context.poseOverridesByCharacterId
  );
  if (!targetPosition) throw new Error(`unable to resolve face target '${targetId}'`);
  const actorPose = findStatePoseAtTime(context.character, context.state, activityStartTime);
  return [createFacingEventForTarget(activityStartTime, actorPose.facingAngle, actorPose.position, targetPosition)];
}
