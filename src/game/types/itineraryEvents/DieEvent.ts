import ItineraryEventBase from "./ItineraryEventBase";

type DieEvent = Readonly<ItineraryEventBase>

export function duplicateDieEvent(from:DieEvent):DieEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration
  };
}

export default DieEvent;