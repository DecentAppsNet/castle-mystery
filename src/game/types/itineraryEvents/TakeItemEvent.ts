import ItineraryEventBase from "./ItineraryEventBase";

type TakeItemEvent = ItineraryEventBase & {
  itemId:string
}

export function duplicateTakeItemEvent(from:TakeItemEvent):TakeItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    itemId:from.itemId
  };
}

export default TakeItemEvent;
