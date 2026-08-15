import Position, { createDefaultPosition, duplicatePosition } from "./Position"

type Waypoint = {
  readonly roomId:string,
  position:Position,
  adjacentWaypoints:Readonly<Waypoint>[],
  exitDirections:Partial<Record<string, Waypoint>>
}

export function createDefaultWaypoint():Waypoint {
  return {
    roomId:'',
    position:createDefaultPosition(),
    adjacentWaypoints:[],
    exitDirections:{}
  };
}

export function duplicateWaypoint(from:Waypoint):Waypoint {
  return {
    roomId:from.roomId,
    position:duplicatePosition(from.position),
    adjacentWaypoints:[...from.adjacentWaypoints],
    exitDirections:{ ...from.exitDirections }
  }
}

export default Waypoint;