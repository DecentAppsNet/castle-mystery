import ItineraryEventBase from "./ItineraryEventBase";

type BecomesCharacterEvent = Readonly<ItineraryEventBase & {
  sourceCharacterId:string,
  targetCharacterId:string
}>

export function duplicateBecomesCharacterEvent(from:BecomesCharacterEvent):BecomesCharacterEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    sourceCharacterId:from.sourceCharacterId,
    targetCharacterId:from.targetCharacterId
  };
}

export default BecomesCharacterEvent;