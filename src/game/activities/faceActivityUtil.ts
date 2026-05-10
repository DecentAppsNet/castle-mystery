import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import {
  ActivityContext,
  createFacingEventForTarget,
  ensureTimestampIsAvailable,
  findStatePoseAtTime,
  findTargetPositionAtTime,
  stripTrailingPeriod
} from "./activityUtil";

export function tryCreateFaceActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('faces ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText);
  const targetId = stripTrailingPeriod(trimmedActivityText.slice('faces'.length).trim());
  if (!targetId.length) throw new Error(`missing target id in itinerary activity '${activityText}'`);

  const targetPosition = findTargetPositionAtTime(
    targetId,
    context.timestamp,
    context.charactersById,
    context.characterStatesById,
    context.roomItemsByRoomId,
    context.poseOverridesByCharacterId
  );
  if (!targetPosition) throw new Error(`unable to resolve face target '${targetId}'`);
  const actorPose = findStatePoseAtTime(context.character, context.state, context.timestamp);
  return [createFacingEventForTarget(context.timestamp, actorPose.facingAngle, actorPose.position, targetPosition)];
}
