import { assert } from "decent-portal";
import ItineraryEventType from "./ItineraryEventType";
import WalkEvent, { duplicateWalkEvent } from "./WalkEvent";
import DieEvent, { duplicateDieEvent } from "./DieEvent";
import FaceEvent, { duplicateFaceEvent } from "./FaceEvent";
import BodyOrientationEvent, { duplicateBodyOrientationEvent } from "./BodyOrientationEvent";
import RoomEntryEvent, { duplicateRoomEntryEvent } from "./RoomEntryEvent";
import SpeechEvent, { duplicateSpeechEvent } from "./SpeechEvent";
import EmitEvent, { duplicateEmitEvent } from "./EmitEvent";
import ThoughtEvent, { duplicateThoughtEvent } from "./ThoughtEvent";
import CharacterEncounterEvent, { duplicateCharacterEncounterEvent } from "./CharacterEncounterEvent";
import TakeItemEvent, { duplicateTakeItemEvent } from "./TakeItemEvent";
import DropItemEvent, { duplicateDropItemEvent } from "./DropItemEvent";
import GiveItemEvent, { duplicateGiveItemEvent } from "./GiveItemEvent";
import LockEvent, { duplicateLockEvent } from "./LockEvent";
import UnlockEvent, { duplicateUnlockEvent } from "./UnlockEvent";

type ItineraryEvent = WalkEvent | DieEvent | FaceEvent | BodyOrientationEvent | RoomEntryEvent | SpeechEvent | EmitEvent | ThoughtEvent | CharacterEncounterEvent | TakeItemEvent | DropItemEvent | GiveItemEvent | LockEvent | UnlockEvent;

export function duplicateItineraryEvent(from:ItineraryEvent):ItineraryEvent {
  switch(from.type) {
    case ItineraryEventType.WALK: return duplicateWalkEvent(from as WalkEvent);
    case ItineraryEventType.DIE: return duplicateDieEvent(from as DieEvent);
    case ItineraryEventType.FACE: return duplicateFaceEvent(from as FaceEvent);
    case ItineraryEventType.BODY_ORIENTATION: return duplicateBodyOrientationEvent(from as BodyOrientationEvent);
    case ItineraryEventType.ROOM_ENTRY: return duplicateRoomEntryEvent(from as RoomEntryEvent);
    case ItineraryEventType.SPEECH: return duplicateSpeechEvent(from as SpeechEvent);
    case ItineraryEventType.EMIT: return duplicateEmitEvent(from as EmitEvent);
    case ItineraryEventType.THOUGHT: return duplicateThoughtEvent(from as ThoughtEvent);
    case ItineraryEventType.CHARACTER_ENCOUNTER: return duplicateCharacterEncounterEvent(from as CharacterEncounterEvent);
    case ItineraryEventType.TAKE_ITEM: return duplicateTakeItemEvent(from as TakeItemEvent);
    case ItineraryEventType.DROP_ITEM: return duplicateDropItemEvent(from as DropItemEvent);
    case ItineraryEventType.GIVE_ITEM: return duplicateGiveItemEvent(from as GiveItemEvent);
    case ItineraryEventType.LOCK: return duplicateLockEvent(from as LockEvent);
    case ItineraryEventType.UNLOCK: return duplicateUnlockEvent(from as UnlockEvent);
    default: assert(false, `unsupported itinerary event type ${(from as ItineraryEvent).type}`);
  }
}    
    
export default ItineraryEvent;
