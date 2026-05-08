import Position, { duplicatePosition } from "../Position";
import ItineraryEventBase from "./ItineraryEventBase";

type DropItemEvent = ItineraryEventBase & {
  itemId:string,
  position:Position
}

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
