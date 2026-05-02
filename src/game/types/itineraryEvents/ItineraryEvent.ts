import { assert } from "decent-portal";
import ItineraryEventType from "./ItineraryEventType";
import WalkEvent, { duplicateWalkEvent } from "./WalkEvent";

type ItineraryEvent = WalkEvent;

export function duplicateItineraryEvent(from:ItineraryEvent):ItineraryEvent {
  assert(from.type === ItineraryEventType.WALK);
  return duplicateWalkEvent(from);
}    
    
export default ItineraryEvent;
