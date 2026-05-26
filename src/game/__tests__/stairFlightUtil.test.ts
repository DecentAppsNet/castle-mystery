// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { FLOOR_WAYPOINT_Y_OFFSET, generateWaypoints } from '../roomUtil';
import { generateStairFlights } from '../stairFlightUtil';
import Rect from '../types/Rect';
import Room from '../types/Room';
import ExitStatus from '../types/ExitStatus';
import ExitType from '../types/ExitType';
import RoomExit, { createRoomExitId } from '../types/RoomExit';
import StairFlight from '../types/StairFlight';
import Waypoint from '../types/Waypoint';

const ROOM_ID = 'Room';

function _createExit(room2Id:string, x:number, y:number):RoomExit {
  return {
    id:createRoomExitId(ROOM_ID, room2Id, x, y),
    room1Id:ROOM_ID,
    room2Id,
    x,
    y,
    exitType:ExitType.doorway,
    lockableFromRoom1With:null,
    lockableFromRoom2With:null,
    exitStatus:ExitStatus.open
  };
}

function _createRoom(rect:Rect, exits:RoomExit[], waypoints?:Waypoint[], stairs:StairFlight[] = []):Room {
  return {
    id:ROOM_ID,
    title:ROOM_ID,
    rect,
    items:[],
    exits,
    stairs,
    waypoints:waypoints || generateWaypoints(ROOM_ID, rect, exits),
    isDiscovered:false,
    isObscured:false
  };
}

describe('stairFlightUtil', () => {
  describe('generateStairFlights()', () => {
    it('returns no flights when the room has no non-floor exits', () => {
      const rect = { x:0, y:0, width:20, height:20 };
      const exits = [_createExit('Other', 20, 20 - FLOOR_WAYPOINT_Y_OFFSET)];

      expect(generateStairFlights(_createRoom(rect, exits))).toEqual([]);
    });

    it('returns direct stair flights when they fit without intersections', () => {
      const rect = { x:0, y:0, width:40, height:20 };
      const exits = [_createExit('Other', 0, 5), _createExit('Other 2', 0, 10)];

      const flights = generateStairFlights(_createRoom(rect, exits));

      expect(flights).toHaveLength(2);
      expect(flights[0].startPosition.x).toBeCloseTo(14.999, 3);
      expect(flights[0].startPosition.y).toBeCloseTo(19.999, 3);
      expect(flights[0].endPosition).toEqual({ x:0, y:5 });
      expect(flights[1].startPosition.x).toBeCloseTo(9.999, 3);
      expect(flights[1].startPosition.y).toBeCloseTo(19.999, 3);
      expect(flights[1].endPosition).toEqual({ x:0, y:10 });
    });

    it('falls back to winding flights when the room is only four columns wide', () => {
      const rect = { x:0, y:0, width:20, height:20 };
      const exits = [_createExit('Other', 0, 10)];

      const flights = generateStairFlights(_createRoom(rect, exits));

      expect(flights).toHaveLength(1);
      expect(flights[0].startPosition.x).toBeCloseTo(2.5, 3);
      expect(flights[0].startPosition.y).toBeCloseTo(19.999, 3);
      expect(flights[0].endPosition.x).toBeCloseTo(12.499, 3);
      expect(flights[0].endPosition.y).toBeCloseTo(10, 3);
    });

    it('falls back to winding flights when direct flights would intersect', () => {
      const rect = { x:0, y:0, width:30, height:20 };
      const exits = [_createExit('Left', 0, 1), _createExit('Right', 30, 1)];

      const flights = generateStairFlights(_createRoom(rect, exits));

      expect(flights).toHaveLength(1);
      expect(flights[0].startPosition.x).toBeCloseTo(1.875, 3);
      expect(flights[0].startPosition.y).toBeCloseTo(19.999, 3);
      expect(flights[0].endPosition.x).toBeCloseTo(20.874, 3);
      expect(flights[0].endPosition.y).toBeCloseTo(1, 3);
    });
  });
});