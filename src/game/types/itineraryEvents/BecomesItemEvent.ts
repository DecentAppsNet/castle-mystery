import ItineraryEventBase from "./ItineraryEventBase";

type BecomesItemEvent = Readonly<ItineraryEventBase & {
  sourceItemId:string,
  targetItemId:string
}>

export function duplicateBecomesItemEvent(from:BecomesItemEvent):BecomesItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    sourceItemId:from.sourceItemId,
    targetItemId:from.targetItemId
  };
}

export default BecomesItemEvent;