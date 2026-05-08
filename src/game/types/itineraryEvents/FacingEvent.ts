import ItineraryEventBase from "./ItineraryEventBase";

type FacingEvent = ItineraryEventBase & {
  facingAngle:number
}

export function duplicateFacingEvent(from:FacingEvent):FacingEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    facingAngle:from.facingAngle
  };
}

export default FacingEvent;
