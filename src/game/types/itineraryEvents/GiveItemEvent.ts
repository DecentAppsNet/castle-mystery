/* This module groups the give-item itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEventBase from "./ItineraryEventBase";

type GiveItemEvent = Readonly<ItineraryEventBase & {
  itemId:string,
  recipientCharacterId:string
}>

export function duplicateGiveItemEvent(from:GiveItemEvent):GiveItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    itemId:from.itemId,
    recipientCharacterId:from.recipientCharacterId
  };
}

export default GiveItemEvent;
