import ItineraryEventBase from "./ItineraryEventBase";

type ThoughtEvent = Readonly<ItineraryEventBase & {
  thought:string
}>

export function duplicateThoughtEvent(from:ThoughtEvent):ThoughtEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    thought:from.thought,
    duration:from.duration
  };
}

export default ThoughtEvent;
