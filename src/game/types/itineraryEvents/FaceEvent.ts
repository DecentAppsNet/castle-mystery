/* This module groups the face-direction itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

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