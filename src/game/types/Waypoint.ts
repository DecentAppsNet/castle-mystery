import Position, { duplicatePosition } from "./Position"

type Waypoint = {
  position:Position,
  adjacentWaypoints:Readonly<Waypoint>[],
  exitDirections:Partial<Record<string, Waypoint>>
}

export function createDefaultWaypoint():Waypoint {
  return {
    position:{ x:0, y:0, z:0 },
    adjacentWaypoints:[],
    exitDirections:{}
  };
}

export function duplicateWaypoint(from:Waypoint):Waypoint {
  return {
    position:duplicatePosition(from.position),
    adjacentWaypoints:[...from.adjacentWaypoints],
    exitDirections:{ ...from.exitDirections }
  }
}

export default Waypoint;