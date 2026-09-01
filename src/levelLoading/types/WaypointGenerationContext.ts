import Waypoint from './Waypoint';

/** Provides all generated waypoints and their room-based lookup. */
type WaypointGenerationContext = {
  readonly waypoints:Waypoint[],
  readonly waypointsByRoomId:ReadonlyMap<string, Waypoint[]>
}

export default WaypointGenerationContext;
