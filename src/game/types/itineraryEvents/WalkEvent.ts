import ItineraryEventBase from "./ItineraryEventBase";
import Coord from "../Coord";

type WalkEvent = ItineraryEventBase & {
  fromPosition: Coord,
  toPosition: Coord,
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
