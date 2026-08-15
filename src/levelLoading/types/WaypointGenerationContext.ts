import Waypoint from './Waypoint';

type WaypointGenerationContext = {
  readonly waypoints:Waypoint[],
  readonly waypointsByRoomId:ReadonlyMap<string, Waypoint[]>
}

export default WaypointGenerationContext;
