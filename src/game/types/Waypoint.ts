/* This module groups the waypoint model and its duplication helper for room navigation state.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Position, { duplicatePosition } from "./Position"

type Waypoint = {
  position:Position,
  adjacentWaypoints:Readonly<Waypoint>[],
  exitDirections:Partial<Record<string, Waypoint>>
}

export function duplicateWaypoint(from:Waypoint):Waypoint {
  return {
    position:duplicatePosition(from.position),
    adjacentWaypoints:[...from.adjacentWaypoints],
    exitDirections:{ ...from.exitDirections }
  }
}

export default Waypoint;