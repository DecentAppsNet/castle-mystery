/* This module groups the room-entry itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEventBase from "./ItineraryEventBase";

type RoomEntryEvent = Readonly<ItineraryEventBase & {
  roomId:string
}>

export function duplicateRoomEntryEvent(from:RoomEntryEvent):RoomEntryEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    roomId:from.roomId
  };
}

export default RoomEntryEvent;