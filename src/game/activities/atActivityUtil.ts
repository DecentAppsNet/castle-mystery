import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import { ActivityContext, ensureTimestampIsAvailable, findCurrentRoom, planMovementToRoom, scheduleEventsToEndAtTime } from "./activityUtil";

export function tryCreateAtActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('@')) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText);
  const targetRoomId = trimmedActivityText.slice(1).trim();
  if (!targetRoomId) throw new Error(`missing room id in authored activity '${activityText}'`);
  if (findCurrentRoom(context.level, context.state.position).id === targetRoomId) return [];
  const unscheduledEvents = planMovementToRoom(context.level, context.state.position, targetRoomId);
  return scheduleEventsToEndAtTime(unscheduledEvents, context.timestamp, context.state.time);
}
