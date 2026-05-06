import { assert } from "decent-portal";
import ItineraryEventType from "./ItineraryEventType";
import WalkEvent, { duplicateWalkEvent } from "./WalkEvent";
import SpeechEvent, { duplicateSpeechEvent } from "./SpeechEvent";

type ItineraryEvent = WalkEvent | SpeechEvent;

export function duplicateItineraryEvent(from:ItineraryEvent):ItineraryEvent {
  switch(from.type) {
    case ItineraryEventType.WALK: return duplicateWalkEvent(from as WalkEvent);
    case ItineraryEventType.SPEECH: return duplicateSpeechEvent(from as SpeechEvent);
    default: assert(false, `unsupported itinerary event type ${(from as ItineraryEvent).type}`);
  }
}    
    
export default ItineraryEvent;
