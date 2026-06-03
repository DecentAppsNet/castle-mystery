import ItineraryEventBase from "./ItineraryEventBase";
import ItemHoldLocation from "../ItemHoldLocation";

type TakeItemEvent = Readonly<ItineraryEventBase & {
  itemId:string,
  destination:ItemHoldLocation
}>

export function duplicateTakeItemEvent(from:TakeItemEvent):TakeItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    itemId:from.itemId,
    destination:from.destination
  };
}

export default TakeItemEvent;
