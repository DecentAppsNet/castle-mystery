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