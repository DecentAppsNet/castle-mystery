import ItineraryEventBase from "./ItineraryEventBase";
import Position from "../Position";

type WalkEvent = Readonly<ItineraryEventBase & {
  fromPosition: Position,
  toPosition: Position,
  fromWaypointPosition?: Position,
  toWaypointPosition?: Position
}>

export function duplicateWalkEvent(from:WalkEvent):WalkEvent {
  return {
    type: from.type,
    startTime: from.startTime,
    fromPosition: {x: from.fromPosition.x, y: from.fromPosition.y, z: from.fromPosition.z},
    toPosition: {x: from.toPosition.x, y: from.toPosition.y, z: from.toPosition.z},
    fromWaypointPosition: from.fromWaypointPosition
      ? { x:from.fromWaypointPosition.x, y:from.fromWaypointPosition.y, z:from.fromWaypointPosition.z }
      : undefined,
    toWaypointPosition: from.toWaypointPosition
      ? { x:from.toWaypointPosition.x, y:from.toWaypointPosition.y, z:from.toWaypointPosition.z }
      : undefined,
    duration: from.duration
  }
}

export default WalkEvent;
