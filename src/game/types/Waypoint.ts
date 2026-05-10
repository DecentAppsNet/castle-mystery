import Position from "./Position"

type Waypoint = {
  position:Position,
  adjacentWaypoints:Readonly<Waypoint>[],
  exitDirections:Partial<Record<string, Waypoint>>
}

export function duplicateWaypoint(from:Waypoint):Waypoint {
  return {
    position:from.position,
    adjacentWaypoints:[...from.adjacentWaypoints],
    exitDirections:{ ...from.exitDirections }
  }
}

export default Waypoint;