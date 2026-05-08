import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import {
  AuthoredActivityContext,
  createFacingEventForTarget,
  ensureTimestampIsAvailable,
  findTargetPositionAtTime,
  stripTrailingPeriod
} from "./activityUtil";

export function tryCreateFaceActivity(activityText:string, context:AuthoredActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('faces ')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText);
  const targetId = stripTrailingPeriod(trimmedActivityText.slice('faces'.length).trim());
  if (!targetId.length) throw new Error(`missing target id in authored activity '${activityText}'`);

  const targetPosition = findTargetPositionAtTime(
    targetId,
    context.timestamp,
    context.charactersById,
    context.characterStatesById,
    context.roomItemsByRoomId
  );
  if (!targetPosition) throw new Error(`unable to resolve face target '${targetId}'`);
  return [createFacingEventForTarget(context.timestamp, context.state.position, targetPosition)];
}
