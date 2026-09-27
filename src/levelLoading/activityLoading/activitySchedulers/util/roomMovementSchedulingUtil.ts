/* This file owns activity-level target and scheduling policy for room-directed character movement.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Room from "@/game/types/Room";
import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/types/Position";
import { ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import Waypoint from "@/levelLoading/types/Waypoint";
import { findBestIncludedFloorWaypointToPosition, findNearestFloorWaypointToPosition, findWaypointsForRoom, isExitWaypoint, isWaypointOnMiddleRow } from "../../waypointFindingUtil";
function _findClaimedWaypoints(waypoints:Waypoint[], snapshot:TimelineKeyframe):Waypoint[] {
  return snapshot.characters.flatMap(character => {
    const waypoint = waypoints.find(candidate => arePositionsEqual(candidate.position, character.position));
    return waypoint ? [waypoint] : [];
  });
}

function _findBestTargetWaypoint(context:WaypointGenerationContext, waypoints:Waypoint[], claimedWaypoints:Waypoint[],
    targetRoom:Room, targetPosition:Position):Waypoint {
  assert(waypoints.length > 0);

  // Prefer open middle-row positions away from items, then target the requested horizontal position.
  const waypoint = findBestIncludedFloorWaypointToPosition(context, targetRoom, claimedWaypoints, candidate => {
    let score = !isExitWaypoint(targetRoom, candidate) ? 1000000 : 0;
    if (isWaypointOnMiddleRow(candidate)) score += 100000;
    if (!targetRoom.items.some(item => arePositionsEqual(item.position, candidate.position))) score += 10000;
    return score + 1000 - Math.hypot(candidate.position.x - targetPosition.x, candidate.position.z - targetPosition.z);
  });
  if (waypoint) return waypoint;

  // A crowded room falls back to sharing the closest floor waypoint.
  const crowdedRoomWaypoint = findNearestFloorWaypointToPosition(context, targetRoom, targetPosition);
  assertNonNullable(crowdedRoomWaypoint, 'How can there be no available waypoints in the room?');
  return crowdedRoomWaypoint;
}
/** Finds the preferred room waypoint for a horizontal destination at a timeline snapshot. */
export function findRoomMovementTargetPosition(context:WaypointGenerationContext, snapshot:TimelineKeyframe,
    targetRoom:Room, targetXPercent:number = .5):Position {
  const waypoints = findWaypointsForRoom(context, targetRoom.id);
  const targetPosition = { x:targetRoom.rect.x + targetXPercent * targetRoom.rect.width, y:0, z:ROOM_MIDDLE_ROW_CENTER_Z };
  const claimedWaypoints = _findClaimedWaypoints(waypoints, snapshot);

  return _findBestTargetWaypoint(context, waypoints, claimedWaypoints, targetRoom, targetPosition).position;
}