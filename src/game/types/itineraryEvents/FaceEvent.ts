import type { FacingDirection } from "../Character";
import ItineraryEventBase from "./ItineraryEventBase";

type FaceEvent = Readonly<ItineraryEventBase & {
  facingDirection:FacingDirection
}>

export function duplicateFaceEvent(from:FaceEvent):FaceEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    facingDirection:from.facingDirection
  };
}

export default FaceEvent;