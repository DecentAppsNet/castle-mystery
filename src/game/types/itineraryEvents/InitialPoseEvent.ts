import CharacterPose, { duplicateCharacterPose } from "../CharacterPose";
import ItineraryEventBase from "./ItineraryEventBase";

type InitialPoseEvent = Readonly<ItineraryEventBase & {
  firstCharacterId:string, // For paired characters, specifies the character with the earliest itinerary event (excluding this one)
  firstCharacterPose:CharacterPose, // Initial pose of first character.
  secondCharacterId:string|null, // Only specified for paired characters.
  secondCharacterPose:CharacterPose|null // Only specified for paired characters.
}>

export function duplicateInitialPoseEvent(from:InitialPoseEvent):InitialPoseEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    firstCharacterId:from.firstCharacterId,
    firstCharacterPose:duplicateCharacterPose(from.firstCharacterPose),
    secondCharacterId:from.secondCharacterId,
    secondCharacterPose:from.secondCharacterPose ? duplicateCharacterPose(from.secondCharacterPose) : null
  };
}

export default InitialPoseEvent;