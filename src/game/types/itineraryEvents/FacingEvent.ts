import ItineraryEventBase from "./ItineraryEventBase";

type FacingEvent = Readonly<ItineraryEventBase & {
  fromFacingAngle:number,
  facingAngle:number
}>

export function duplicateFacingEvent(from:FacingEvent):FacingEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    fromFacingAngle:from.fromFacingAngle,
    facingAngle:from.facingAngle
  };
}

export default FacingEvent;
