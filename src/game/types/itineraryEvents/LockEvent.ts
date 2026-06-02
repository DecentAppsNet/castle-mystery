/* This module groups the lock itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEventBase from "./ItineraryEventBase";

type LockEvent = Readonly<ItineraryEventBase & {
  roomExitId:string
}>

export function duplicateLockEvent(from:LockEvent):LockEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    roomExitId:from.roomExitId
  };
}

export default LockEvent;