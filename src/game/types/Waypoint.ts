import Position from "./Position"
import RoomExit from "./RoomExit"

type Waypoint = {
  position:Position,
  adjacentWaypoints:Readonly<Waypoint>[],
  adjacentExits:Readonly<RoomExit>[]
}

export function duplicateWaypoint(from:Waypoint):Waypoint {
  return {
    position:from.position,
    adjacentWaypoints:[...from.adjacentWaypoints],
    adjacentExits:[...from.adjacentExits]
  }
}

export default Waypoint;