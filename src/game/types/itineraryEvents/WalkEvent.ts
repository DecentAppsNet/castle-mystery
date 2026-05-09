import ItineraryEventBase from "./ItineraryEventBase";
import Position from "../Position";

type WalkEvent = Readonly<ItineraryEventBase & {
  fromPosition: Position,
  toPosition: Position,
  facingAngle:number
}>

export function duplicateWalkEvent(from:WalkEvent):WalkEvent {
  return {
    type: from.type,
    startTime: from.startTime,
    fromPosition: {x: from.fromPosition.x, y: from.fromPosition.y},
    toPosition: {x: from.toPosition.x, y: from.toPosition.y},
    facingAngle: from.facingAngle,
    duration: from.duration
  }
}

export default WalkEvent;
