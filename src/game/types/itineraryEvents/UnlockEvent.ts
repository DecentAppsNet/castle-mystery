/* This module groups the unlock itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEventBase from "./ItineraryEventBase";

type UnlockEvent = Readonly<ItineraryEventBase & {
  roomExitId:string
}>

export function duplicateUnlockEvent(from:UnlockEvent):UnlockEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    roomExitId:from.roomExitId
  };
}

export default UnlockEvent;