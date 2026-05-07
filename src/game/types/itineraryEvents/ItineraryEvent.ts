import { assert } from "decent-portal";
import ItineraryEventType from "./ItineraryEventType";
import WalkEvent, { duplicateWalkEvent } from "./WalkEvent";
import SpeechEvent, { duplicateSpeechEvent } from "./SpeechEvent";
import TakeItemEvent, { duplicateTakeItemEvent } from "./TakeItemEvent";
import DropItemEvent, { duplicateDropItemEvent } from "./DropItemEvent";
import GiveItemEvent, { duplicateGiveItemEvent } from "./GiveItemEvent";

type ItineraryEvent = WalkEvent | SpeechEvent | TakeItemEvent | DropItemEvent | GiveItemEvent;

export function duplicateItineraryEvent(from:ItineraryEvent):ItineraryEvent {
  switch(from.type) {
    case ItineraryEventType.WALK: return duplicateWalkEvent(from as WalkEvent);
    case ItineraryEventType.SPEECH: return duplicateSpeechEvent(from as SpeechEvent);
    case ItineraryEventType.TAKE_ITEM: return duplicateTakeItemEvent(from as TakeItemEvent);
    case ItineraryEventType.DROP_ITEM: return duplicateDropItemEvent(from as DropItemEvent);
    case ItineraryEventType.GIVE_ITEM: return duplicateGiveItemEvent(from as GiveItemEvent);
    default: assert(false, `unsupported itinerary event type ${(from as ItineraryEvent).type}`);
  }
}    
    
export default ItineraryEvent;
