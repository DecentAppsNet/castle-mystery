import ItineraryEventBase from "./ItineraryEventBase";

type RoomEntryEvent = ItineraryEventBase & {
  roomId:string
}

export function duplicateRoomEntryEvent(from:RoomEntryEvent):RoomEntryEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    roomId:from.roomId
  };
}

export default RoomEntryEvent;