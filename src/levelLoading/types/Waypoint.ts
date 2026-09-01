import Position from '@/game/types/Position';

/** A room-local navigation node connected to adjacent waypoints. */
type Waypoint = {
  readonly roomId:string,
  position:Position,
  adjacentWaypoints:Readonly<Waypoint>[]
}

export default Waypoint;
