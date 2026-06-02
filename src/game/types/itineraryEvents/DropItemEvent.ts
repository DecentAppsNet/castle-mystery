/* This module groups the drop-item itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Position, { duplicatePosition } from "../Position";
import ItineraryEventBase from "./ItineraryEventBase";

type DropItemEvent = Readonly<ItineraryEventBase & {
  itemId:string,
  position:Position
}>

export function duplicateDropItemEvent(from:DropItemEvent):DropItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    itemId:from.itemId,
    position:duplicatePosition(from.position)
  };
}

export default DropItemEvent;
