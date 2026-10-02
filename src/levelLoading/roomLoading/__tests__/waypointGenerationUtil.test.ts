import { describe, expect, it } from 'vitest';

import { ROOM_BACK_Z } from '@/game/roomSpaceConstants';
import StairFlight from '@/game/types/StairFlight';
import { WAYPOINT_BACK_ROW_Z } from '@/levelLoading/activityLoading/waypointFindingUtil';
import { calcRoomFloorY } from '@/game/squareUtil';
import { generateWaypoints } from '../waypointGenerationUtil';

const ROOM_RECT = { x:0, y:0, width:20, height:20 };
const FLOOR_Y = calcRoomFloorY(ROOM_RECT);

function _findStairStartFloorNeighbors(flight:StairFlight):number[] {
  const waypoints = generateWaypoints('room', ROOM_RECT, [], [flight]);
  const stairStartWaypoint = waypoints.find(waypoint => waypoint.position.x === flight.startPosition.x
    && waypoint.position.y === flight.startPosition.y
    && waypoint.position.z === WAYPOINT_BACK_ROW_Z);
  expect(stairStartWaypoint).toBeDefined();
  return stairStartWaypoint!.adjacentWaypoints
    .filter(waypoint => waypoint.position.y === FLOOR_Y)
    .map(waypoint => waypoint.position.x);
}

describe('waypointGenerationUtil', () => {
  describe('generateWaypoints()', () => {
    it('approaches a left-ascending stair from its right side', () => {
      const flight = {
        startPosition:{ x:10, y:FLOOR_Y, z:ROOM_BACK_Z },
        endPosition:{ x:5, y:10, z:ROOM_BACK_Z }
      };

      expect(_findStairStartFloorNeighbors(flight)).toEqual([12.5]);
    });

    it('approaches a right-ascending stair from its left side', () => {
      const flight = {
        startPosition:{ x:10, y:FLOOR_Y, z:ROOM_BACK_Z },
        endPosition:{ x:15, y:10, z:ROOM_BACK_Z }
      };

      expect(_findStairStartFloorNeighbors(flight)).toEqual([7.5]);
    });
  });
});
