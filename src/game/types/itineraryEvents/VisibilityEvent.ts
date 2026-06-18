import ItineraryEventBase from "./ItineraryEventBase";

type VisibilityEvent = Readonly<ItineraryEventBase & {
  targetId:string
}>

export function duplicateVisibilityEvent(from:VisibilityEvent):VisibilityEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    targetId:from.targetId
  };
}

export default VisibilityEvent;
