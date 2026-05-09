import ItineraryEventBase from "./ItineraryEventBase";

type FacingEvent = Readonly<ItineraryEventBase & {
  facingAngle:number
}>

export function duplicateFacingEvent(from:FacingEvent):FacingEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    facingAngle:from.facingAngle
  };
}

export default FacingEvent;
