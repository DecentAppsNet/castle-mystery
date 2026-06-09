import Position, { duplicatePosition } from "../Position";
import ItineraryEventBase from "./ItineraryEventBase";

type DropItemEvent = Readonly<ItineraryEventBase & {
  itemId:string,
  position:Position,
  drawOffset:Position
}>

export function duplicateDropItemEvent(from:DropItemEvent):DropItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    itemId:from.itemId,
    position:duplicatePosition(from.position),
    drawOffset:duplicatePosition(from.drawOffset)
  };
}

export default DropItemEvent;
