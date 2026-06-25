// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { generateWaypoints } from '@/levelLoading/waypointGenerationUtil';
import { ROOM_BACK_Z, ROOM_FRONT_ROW_MIN_Z, ROOM_MIDDLE_ROW_MIN_Z, ROOM_ROW_DEPTH } from '../roomSpaceConstants';
import { generateStairParts } from '../stairPartUtil';
import { generateStairFlights } from '../stairFlightUtil';
import { FLOOR_WAYPOINT_Y_OFFSET } from '../waypointUtil';
import Rect from '../types/Rect';
import Room, { createDefaultRoom } from '../types/Room';
import ExitStatus from '../types/ExitStatus';
import ExitType from '../types/ExitType';
import RoomExit, { createRoomExitId } from '../types/RoomExit';
import { StairPartType } from '../types/StairPart';
import Waypoint from '../types/Waypoint';

const ROOM_ID = 'Room';
const BACK_ROW_Z = ROOM_BACK_Z;
const MIDDLE_ROW_Z = ROOM_MIDDLE_ROW_MIN_Z;
const FRONT_ROW_Z = ROOM_FRONT_ROW_MIN_Z;
const STAIR_CUBOID_DEPTH = ROOM_ROW_DEPTH;
const LANDING_CUBOID_DEPTH = ROOM_FRONT_ROW_MIN_Z;

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

function _createRoom(rect:Rect, exits:RoomExit[], waypoints?:Waypoint[]):Room {
  return {
    ...createDefaultRoom(),
    id:ROOM_ID,
    title:ROOM_ID,
    rect,
    exits,
    waypoints:waypoints || generateWaypoints(ROOM_ID, rect, exits),
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
      expect(flights[0].startPosition.x).toBeCloseTo(19.999, 3);
      expect(flights[0].startPosition.y).toBeCloseTo(19.999, 3);
      expect(flights[0].endPosition).toEqual({ x:5, y:5, z:BACK_ROW_Z });
      expect(flights[1].startPosition.x).toBeCloseTo(14.999, 3);
      expect(flights[1].startPosition.y).toBeCloseTo(19.999, 3);
      expect(flights[1].endPosition).toEqual({ x:5, y:10, z:BACK_ROW_Z });
    });

    it('falls back to winding flights when the room is only four columns wide', () => {
      const rect = { x:0, y:0, width:20, height:40 };
      const exits = [_createExit('Other', 0, 20)];

      const flights = generateStairFlights(_createRoom(rect, exits));

      expect(flights).toHaveLength(2);
      expect(flights[0].startPosition.x).toBeCloseTo(5, 3);
      expect(flights[0].startPosition.y).toBeCloseTo(39.999, 3);
      expect(flights[0].endPosition.x).toBeCloseTo(15, 3);
      expect(flights[0].endPosition.y).toBeCloseTo(30, 3);
      expect(flights[1].startPosition.x).toBeCloseTo(15, 3);
      expect(flights[1].startPosition.y).toBeCloseTo(30, 3);
      expect(flights[1].endPosition.x).toBeCloseTo(5, 3);
      expect(flights[1].endPosition.y).toBeCloseTo(20, 3);
    });

    it('falls back to winding flights when direct flights would intersect', () => {
      const rect = { x:0, y:0, width:30, height:40 };
      const exits = [_createExit('Left', 0, 20), _createExit('Right', 30, 20)];

      const flights = generateStairFlights(_createRoom(rect, exits));

      expect(flights).toHaveLength(2);
      expect(flights[0].startPosition.x).toBeCloseTo(11.25, 3);
      expect(flights[0].startPosition.y).toBeCloseTo(39.999, 3);
      expect(flights[0].endPosition.x).toBeCloseTo(18.75, 3);
      expect(flights[0].endPosition.y).toBeCloseTo(30, 3);
      expect(flights[1].startPosition.x).toBeCloseTo(18.75, 3);
      expect(flights[1].startPosition.y).toBeCloseTo(30, 3);
      expect(flights[1].endPosition.x).toBeCloseTo(11.25, 3);
      expect(flights[1].endPosition.y).toBeCloseTo(20, 3);
    });
  });

  describe('generateStairParts()', () => {
    it('creates a landing adjacent to the exit for a direct stair exit', () => {
      const rect = { x:0, y:0, width:40, height:20 };
      const exits = [_createExit('Other', 0, 5)];
      const room = _createRoom(rect, exits);
      const flights = generateStairFlights(room);

      const stairParts = generateStairParts(room, flights);

      expect(stairParts.map(part => part.type)).toEqual([StairPartType.flight, StairPartType.landing]);
      expect(stairParts[0]).toMatchObject({ type:StairPartType.flight, z:BACK_ROW_Z });
      expect(stairParts[1]).toMatchObject({ type:StairPartType.landing, z:BACK_ROW_Z });
      if (stairParts[1].type !== StairPartType.landing) throw new Error('expected direct landing');
      expect(stairParts[1].leftX).toBeCloseTo(0, 4);
      expect(stairParts[1].width).toBeCloseTo(5, 4);
      expect(stairParts[1].height).toBeCloseTo(1, 3);
      expect(stairParts[1].depth).toBeCloseTo(LANDING_CUBOID_DEPTH, 4);
      expect(stairParts[1].topY).toBeCloseTo(5, 4);
    });

    it('aligns a direct right-exit landing with the topmost step cuboid', () => {
      const rect = { x:0, y:0, width:40, height:20 };
      const exits = [_createExit('Other', 40, 5)];
      const room = _createRoom(rect, exits);
      const flights = generateStairFlights(room);

      const stairParts = generateStairParts(room, flights);

      expect(stairParts.map(part => part.type)).toEqual([StairPartType.landing, StairPartType.flight]);
      if (stairParts[0].type !== StairPartType.landing) throw new Error('expected direct landing');
      expect(stairParts[0]).toMatchObject({ type:StairPartType.landing, z:BACK_ROW_Z });
      expect(stairParts[0].leftX).toBeCloseTo(35, 4);
      expect(stairParts[0].topY).toBeCloseTo(5, 4);
      expect(stairParts[0].width).toBeCloseTo(5, 4);
      expect(stairParts[0].height).toBeCloseTo(1, 3);
      if (stairParts[1].type !== StairPartType.flight) throw new Error('expected direct flight');
      expect(stairParts[1]).toMatchObject({ type:StairPartType.flight, endPosition:{ x:35, y:5, z:BACK_ROW_Z }, z:BACK_ROW_Z });
      expect(stairParts[1].endPosition.y).toBeCloseTo(stairParts[0].topY, 4);
      expect(stairParts[1].endPosition.x).toBeCloseTo(stairParts[0].leftX, 4);
    });

    it('orders simple winding parts as landing, back flight, front flight, story landing', () => {
      const rect = { x:0, y:0, width:20, height:40 };
      const exits = [_createExit('Other', 0, 20)];
      const room = _createRoom(rect, exits);
      const flights = generateStairFlights(room);

      const stairParts = generateStairParts(room, flights);

      expect(stairParts.map(part => part.type)).toEqual([StairPartType.landing, StairPartType.flight, StairPartType.flight, StairPartType.landing]);
      expect(stairParts[1]).toMatchObject({ type:StairPartType.flight, z:BACK_ROW_Z });
      expect(stairParts[2]).toMatchObject({ type:StairPartType.flight, z:FRONT_ROW_Z });
    });

    it('draws right catwalks before front-row flights for intersecting exits', () => {
      const rect = { x:0, y:0, width:30, height:40 };
      const exits = [_createExit('Left', 0, 20), _createExit('Right', 30, 20)];
      const room = _createRoom(rect, exits);
      const flights = generateStairFlights(room);

      const stairParts = generateStairParts(room, flights);

      expect(stairParts.map(part => part.type)).toEqual([
        StairPartType.landing,
        StairPartType.flight,
        StairPartType.catwalk,
        StairPartType.flight,
        StairPartType.landing,
        StairPartType.catwalk
      ]);
      const storyLanding = stairParts[4];
      expect(storyLanding).toMatchObject({ type:StairPartType.landing, depth:LANDING_CUBOID_DEPTH });
      expect(storyLanding.type).toBe(StairPartType.landing);
      if (storyLanding.type !== StairPartType.landing) throw new Error('expected winding story landing');
      expect(storyLanding.z).toBeCloseTo(MIDDLE_ROW_Z, 4);
      expect(stairParts[2]).toMatchObject({ type:StairPartType.catwalk, leftX:11.25, width:18.75, depth:STAIR_CUBOID_DEPTH });
      expect(stairParts[5]).toMatchObject({ type:StairPartType.catwalk, leftX:0, width:7.5, depth:STAIR_CUBOID_DEPTH });
    });
  });
});