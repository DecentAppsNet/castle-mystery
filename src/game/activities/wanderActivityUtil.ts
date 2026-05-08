import { createInRoomRandomWalkEvent } from "../itineraryUtil";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import { AuthoredActivityContext, ensureTimestampIsAvailable, stripTrailingPeriod } from "./activityUtil";

export function tryCreateWanderActivity(activityText:string, context:AuthoredActivityContext):ItineraryEvent[]|null {
  if (stripTrailingPeriod(activityText) !== 'wanders') return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText);
  return [createInRoomRandomWalkEvent(context.level.rooms, context.state.position.x, context.state.position.y, context.timestamp)];
}
