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