import ItineraryEventBase from "./ItineraryEventBase";
import Position from "../Position";

type WalkEvent = ItineraryEventBase & {
  fromPosition: Position,
  toPosition: Position,
  duration: number
}

export function duplicateWalkEvent(from:WalkEvent):WalkEvent {
  return {
    type: from.type,
    startTime: from.startTime,
    fromPosition: {x: from.fromPosition.x, y: from.fromPosition.y},
    toPosition: {x: from.toPosition.x, y: from.toPosition.y},
    duration: from.duration
  }
}

export default WalkEvent;
