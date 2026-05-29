import ItineraryEventBase from "./ItineraryEventBase";
import Position from "../Position";

type WalkEvent = Readonly<ItineraryEventBase & {
  fromPosition: Position,
  toPosition: Position
}>

export function duplicateWalkEvent(from:WalkEvent):WalkEvent {
  return {
    type: from.type,
    startTime: from.startTime,
    fromPosition: {x: from.fromPosition.x, y: from.fromPosition.y, z: from.fromPosition.z},
    toPosition: {x: from.toPosition.x, y: from.toPosition.y, z: from.toPosition.z},
    duration: from.duration
  }
}

export default WalkEvent;
