/* This module groups the thought itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEventBase from "./ItineraryEventBase";

type ThoughtEvent = Readonly<ItineraryEventBase & {
  thought:string
}>

export function duplicateThoughtEvent(from:ThoughtEvent):ThoughtEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    thought:from.thought,
    duration:from.duration
  };
}

export default ThoughtEvent;
