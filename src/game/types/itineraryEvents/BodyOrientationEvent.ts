import type { BodyOrientation } from "../Character";
import ItineraryEventBase from "./ItineraryEventBase";

type BodyOrientationEvent = Readonly<ItineraryEventBase & {
  bodyOrientation:BodyOrientation
}>

export function duplicateBodyOrientationEvent(from:BodyOrientationEvent):BodyOrientationEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    bodyOrientation:from.bodyOrientation
  };
}

export default BodyOrientationEvent;