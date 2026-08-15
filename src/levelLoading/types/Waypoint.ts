import Position from '@/game/types/Position';

type Waypoint = {
  readonly roomId:string,
  position:Position,
  adjacentWaypoints:Readonly<Waypoint>[],
  exitDirections:Partial<Record<string, Waypoint>>
}

export default Waypoint;
