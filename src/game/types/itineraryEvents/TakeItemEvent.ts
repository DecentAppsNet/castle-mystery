/* This module groups the take-item itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEventBase from "./ItineraryEventBase";

type TakeItemEvent = Readonly<ItineraryEventBase & {
  itemId:string
}>

export function duplicateTakeItemEvent(from:TakeItemEvent):TakeItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    itemId:from.itemId
  };
}

export default TakeItemEvent;
