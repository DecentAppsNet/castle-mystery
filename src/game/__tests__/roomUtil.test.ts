// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import {
  calcRoomsBoundingRect,
  findCharactersInRoom,
  findRoom,
  findRoomAtPosition,
  findRoomAtPositionOrTouchingBoundary,
  findRoomByIdOrTitle,
  findRoomNearestToPosition
} from '../roomUtil';
import { generateWaypoints } from '@/levelLoading/waypointGenerationUtil';
import { ROOM_BACK_Z, ROOM_MIDDLE_ROW_CENTER_Z } from '../roomSpaceConstants';
import { COLUMNS_PER_MAP_TILE, roomWidthToColumnCount } from '../roomGridUtil';
import { findExitWaypoint, findNearestWaypoint, FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_BACK_ROW_Z, WAYPOINT_FRONT_ROW_Z, WAYPOINT_MIDDLE_ROW_Z } from '../waypointUtil';
import { generateStairFlights } from '../stairFlightUtil';
import Character, { createDefaultCharacter } from '../types/Character';
import Rect from '../types/Rect';
import Room, { createDefaultRoom } from '../types/Room';
import ExitStatus from '../types/ExitStatus';
import ExitType from '../types/ExitType';
import RoomExit, { createRoomExitId } from '../types/RoomExit';
import StairFlight from '../types/StairFlight';
import Waypoint from '../types/Waypoint';

const ROOM_ID = 'Room';
const ROOM_RECT:Rect = { x:0, y:0, width:20, height:20 };
const BACK_ROW_Z = ROOM_BACK_Z;
const DEFAULT_CHARACTER_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;

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

function _createRoom(id:string, rect:Rect, exits:RoomExit[] = [], waypoints:Waypoint[] = []):Room {
  return {
    ...createDefaultRoom(),
    id,
    title:id,
    rect,
    exits,
    waypoints
  };
}

function _createCharacter(id:string, x:number, y:number):Character {
  const waypoint:Waypoint = { position:{ x, y, z:BACK_ROW_Z }, adjacentWaypoints:[], exitDirections:{} };
  return {
    ...createDefaultCharacter(),
    id,
    title:id,
    description:id,
    position:{ x, y, z:DEFAULT_CHARACTER_DEPTH },
    waypoint
  };
}

function _createWaypoint(x:number, y:number):Waypoint {
  return { position:{ x, y, z:BACK_ROW_Z }, adjacentWaypoints:[], exitDirections:{} };
}

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y},${waypoint.position.z}`;
}

function _assertAllWaypointsHaveNeighbors(waypoints:Waypoint[]) {
  waypoints.forEach(waypoint => {
    expect(waypoint.adjacentWaypoints.length).toBeGreaterThan(0);
  });
}

function _assertAllWaypointsAreInsideRoomRect(waypoints:Waypoint[], roomRect:Rect) {
  waypoints.forEach(waypoint => {
    expect(waypoint.position.x).toBeGreaterThanOrEqual(roomRect.x);
    expect(waypoint.position.x).toBeLessThanOrEqual(roomRect.x + roomRect.width);
    expect(waypoint.position.y).toBeGreaterThanOrEqual(roomRect.y);
    expect(waypoint.position.y).toBeLessThanOrEqual(roomRect.y + roomRect.height);
  });
}

function _findWaypoint(waypoints:Waypoint[], x:number, y:number, z?:number):Waypoint | undefined {
  return waypoints.find(waypoint => waypoint.position.x === x && waypoint.position.y === y && (z === undefined || waypoint.position.z === z));
}

function _findWaypointNear(waypoints:Waypoint[], x:number, y:number, z?:number, precision:number = 3):Waypoint | undefined {
  return waypoints.find(waypoint => {
    return Math.abs(waypoint.position.x - x) < 10 ** -precision
      && Math.abs(waypoint.position.y - y) < 10 ** -precision
      && (z === undefined || Math.abs(waypoint.position.z - z) < 10 ** -precision);
  });
}

function _createStairs(rect:Rect, exits:RoomExit[]):StairFlight[] {
  const baseWaypoints = generateWaypoints(ROOM_ID, rect, exits);
  return generateStairFlights(_createRoom(ROOM_ID, rect, exits, baseWaypoints));
}

function _assertExitRouteTerminates(exitWaypoint:Waypoint, startWaypoint:Waypoint, adjacentRoomId:string) {
  const visited = new Set<string>([_createWaypointKey(startWaypoint)]);
  let currentWaypoint = startWaypoint;

  while (currentWaypoint !== exitWaypoint) {
    const nextWaypoint = currentWaypoint.exitDirections[adjacentRoomId];
    expect(nextWaypoint).toBeDefined();
    expect(currentWaypoint.adjacentWaypoints).toContain(nextWaypoint);
    currentWaypoint = nextWaypoint!;
    const waypointKey = _createWaypointKey(currentWaypoint);
    expect(visited.has(waypointKey)).toBe(false);
    visited.add(waypointKey);
  }
}

describe('roomUtil', () => {
  describe('findRoom()', () => {
    it('returns the room with the matching id', () => {
      const throneRoom = _createRoom('Throne Room', { x:0, y:0, width:20, height:20 });
      const library = _createRoom('library', { x:20, y:0, width:20, height:20 });

      expect(findRoom([throneRoom, library], 'Library')).toBe(library);
    });

    it('throws when no room has the requested id', () => {
      const rooms = [_createRoom('Hall', ROOM_RECT)];

      expect(() => findRoom(rooms, 'Kitchen')).toThrow(/room with id Kitchen not found/i);
    });
  });

  describe('findRoomByIdOrTitle()', () => {
    it('returns the room with the matching title when the room id differs', () => {
      const hall = _createRoom('hall', ROOM_RECT);
      const balcony = { ..._createRoom('balcony', { x:20, y:0, width:20, height:20 }), title:'Upper Hallway' };

      expect(findRoomByIdOrTitle([hall, balcony], 'Upper Hallway')).toBe(balcony);
    });

    it('throws when no room has the requested id or title', () => {
      const rooms = [_createRoom('Hall', ROOM_RECT)];

      expect(() => findRoomByIdOrTitle(rooms, 'Kitchen')).toThrow(/room with id or title Kitchen not found/i);
    });
  });

  describe('findExitWaypoint()', () => {
    it('returns the waypoint positioned at the exit coordinate', () => {
      const exit = _createExit('West', 0, 10);
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, [exit]);

      const exitWaypoint = findExitWaypoint(ROOM_ID, ROOM_RECT, exit, waypoints);

      expect(exitWaypoint.position).toEqual({ x:0, y:10, z:WAYPOINT_MIDDLE_ROW_Z });
      expect(waypoints).toContain(exitWaypoint);
    });

    it('returns floor exit waypoints offset by the floor waypoint amount', () => {
      const exit = _createExit('East', 20, ROOM_RECT.y + ROOM_RECT.height - FLOOR_WAYPOINT_Y_OFFSET);
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, [exit]);

      const exitWaypoint = findExitWaypoint(ROOM_ID, ROOM_RECT, exit, waypoints);

      expect(exitWaypoint.position).toEqual({ x:20, y:ROOM_RECT.y + ROOM_RECT.height - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_MIDDLE_ROW_Z });
      expect(waypoints).toContain(exitWaypoint);
    });

    it('throws when the waypoint collection does not contain the exit waypoint', () => {
      const exit = _createExit('West', 0, 10);

      expect(() => findExitWaypoint(ROOM_ID, ROOM_RECT, exit, [])).toThrow(/missing exit waypoint/i);
    });

    it('throws when the exit is not on the room boundary', () => {
      const invalidExit = _createExit('North', 10, 10);

      expect(() => findExitWaypoint(ROOM_ID, ROOM_RECT, invalidExit, [])).toThrow(/not on a supported boundary/i);
    });

    it('asserts when the exit is on the ceiling', () => {
      const ceilingExit = _createExit('North', 10, 0);

      expect(() => findExitWaypoint(ROOM_ID, ROOM_RECT, ceilingExit, [])).toThrow(/not on a supported boundary|ceiling exits are not supported/i);
    });
  });

  describe('roomWidthToColumnCount()', () => {
    it('returns four columns per map tile of room width', () => {
      expect(roomWidthToColumnCount(20)).toBe(COLUMNS_PER_MAP_TILE);
      expect(roomWidthToColumnCount(40)).toBe(COLUMNS_PER_MAP_TILE * 2);
      expect(roomWidthToColumnCount(60)).toBe(COLUMNS_PER_MAP_TILE * 3);
    });
  });

  describe('findRoomAtPosition()', () => {
    it('returns the room containing the position', () => {
      const hall = _createRoom('Hall', { x:0, y:0, width:20, height:20 });
      const library = _createRoom('Library', { x:20, y:0, width:20, height:20 });

      expect(findRoomAtPosition([hall, library], 25, 10)).toBe(library);
    });

    it('returns null when the position is not inside any room', () => {
      const rooms = [_createRoom('Hall', ROOM_RECT)];

      expect(findRoomAtPosition(rooms, 20, 20)).toBeNull();
    });
  });

  describe('findRoomAtPositionOrTouchingBoundary()', () => {
    it('returns the room when the position lies on its boundary', () => {
      const hall = _createRoom('Hall', ROOM_RECT);

      expect(findRoomAtPositionOrTouchingBoundary([hall], 20, 20)).toBe(hall);
    });
  });

  describe('findRoomNearestToPosition()', () => {
    it('returns the nearest room for a position outside all rooms', () => {
      const hall = _createRoom('Hall', { x:0, y:0, width:20, height:20 });
      const library = _createRoom('Library', { x:100, y:0, width:20, height:20 });

      expect(findRoomNearestToPosition([hall, library], 70, 10)).toBe(library);
    });

    it('throws when called with no rooms', () => {
      expect(() => findRoomNearestToPosition([], 0, 0)).toThrow(/at least one room/i);
    });

    it('returns the only room in a non-empty collection', () => {
      const hall = _createRoom('Hall', { x:50, y:50, width:20, height:20 });

      expect(findRoomNearestToPosition([hall], -100, -100)).toBe(hall);
    });
  });

  describe('findCharactersInRoom()', () => {
    it('returns the characters positioned inside the room rect', () => {
      const hall = _createRoom('Hall', ROOM_RECT);
      const king = _createCharacter('King', 5, 5);
      const queen = _createCharacter('Queen', 19, 19);
      const guard = _createCharacter('Guard', 20, 10);

      expect(findCharactersInRoom(hall, [king, queen, guard])).toEqual([king, queen]);
    });

    it('returns an empty array when no characters are inside the room', () => {
      const hall = _createRoom('Hall', ROOM_RECT);
      const guard = _createCharacter('Guard', 25, 25);

      expect(findCharactersInRoom(hall, [guard])).toEqual([]);
    });
  });

  describe('calcRoomsBoundingRect()', () => {
    it('returns a rect that covers all provided rooms', () => {
      const rooms = [
        _createRoom('Hall', { x:10, y:20, width:30, height:40 }),
        _createRoom('Library', { x:-5, y:25, width:10, height:10 }),
        _createRoom('Kitchen', { x:20, y:-10, width:15, height:15 })
      ];

      expect(calcRoomsBoundingRect(rooms)).toEqual({ x:-5, y:-10, width:45, height:70 });
    });

    it('throws when called with no rooms', () => {
      expect(() => calcRoomsBoundingRect([])).toThrow(/cannot calculate room bounds with no rooms/i);
    });
  });

  describe('findNearestWaypoint()', () => {
    it('returns the nearest waypoint in the room', () => {
      const waypoints = [_createWaypoint(5, 5), _createWaypoint(15, 15), _createWaypoint(30, 5)];
      const room = _createRoom('Hall', { x:0, y:0, width:40, height:20 }, [], waypoints);

      expect(findNearestWaypoint(room, 16, 14)).toBe(waypoints[1]);
    });

    it('returns the nearest waypoint matching the predicate', () => {
      const waypoints = [_createWaypoint(5, 5), _createWaypoint(15, 15), _createWaypoint(30, 5)];
      const room = _createRoom('Hall', { x:0, y:0, width:40, height:20 }, [], waypoints);

      expect(findNearestWaypoint(room, 16, 14, waypoint => waypoint.position.y < 10)).toBe(waypoints[0]);
    });

    it('throws when the room has no waypoint matching the request', () => {
      const room = _createRoom('Hall', ROOM_RECT, [], []);

      expect(() => findNearestWaypoint(room, 5, 5)).toThrow(/unable to find waypoint in room Hall/i);
      expect(() => findNearestWaypoint(_createRoom('Hall', ROOM_RECT, [], [_createWaypoint(5, 5)]), 5, 5, () => false))
        .toThrow(/unable to find waypoint in room Hall/i);
    });
  });

  describe('generateWaypoints()', () => {
    it('creates column-based floor waypoints for a simple room with no exits', () => {
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, []);

      expect(waypoints.map(waypoint => waypoint.position)).toEqual([
        { x:2.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_BACK_ROW_Z },
        { x:7.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_BACK_ROW_Z },
        { x:12.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_BACK_ROW_Z },
        { x:17.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_BACK_ROW_Z },
        { x:2.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_MIDDLE_ROW_Z },
        { x:7.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_MIDDLE_ROW_Z },
        { x:12.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_MIDDLE_ROW_Z },
        { x:17.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_MIDDLE_ROW_Z },
        { x:2.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_FRONT_ROW_Z },
        { x:7.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_FRONT_ROW_Z },
        { x:12.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_FRONT_ROW_Z },
        { x:17.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_FRONT_ROW_Z }
      ]);
      _assertAllWaypointsAreInsideRoomRect(waypoints, ROOM_RECT);
    });

    it('creates exit waypoints in addition to column floor waypoints', () => {
      const exits = [
        _createExit('West', 0, 12),
        _createExit('East', 20, ROOM_RECT.y + ROOM_RECT.height - FLOOR_WAYPOINT_Y_OFFSET)
      ];

      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, exits);

      expect(_findWaypoint(waypoints, 0, 12, WAYPOINT_MIDDLE_ROW_Z)).toBeDefined();
      expect(_findWaypoint(waypoints, 20, ROOM_RECT.y + ROOM_RECT.height - FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z)).toBeDefined();
      expect(_findWaypoint(waypoints, 2.5, 20 - FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_BACK_ROW_Z)).toBeDefined();
      expect(_findWaypoint(waypoints, 17.5, 20 - FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_FRONT_ROW_Z)).toBeDefined();
    });

    it('creates stair and landing waypoints instead of a centered spine when stairs are provided', () => {
      const stairRect = { x:0, y:0, width:20, height:40 };
      const exits = [_createExit('West', 0, 20)];
      const stairs = _createStairs(stairRect, exits);

      const waypoints = generateWaypoints(ROOM_ID, stairRect, exits, stairs);

      expect(_findWaypointNear(waypoints, 2.5, 20, WAYPOINT_MIDDLE_ROW_Z)).toBeDefined();
      expect(_findWaypointNear(waypoints, 2.5, 20, WAYPOINT_FRONT_ROW_Z)).toBeDefined();
      expect(_findWaypointNear(waypoints, 15, 30, WAYPOINT_BACK_ROW_Z)).toBeDefined();
      expect(_findWaypointNear(waypoints, 15, 30, WAYPOINT_FRONT_ROW_Z)).toBeDefined();
      expect(_findWaypoint(waypoints, 7.5, 20, WAYPOINT_MIDDLE_ROW_Z)).toBeUndefined();
    });

    it('connects landing waypoints to the exit and the stair flight', () => {
      const stairRect = { x:0, y:0, width:20, height:40 };
      const exits = [_createExit('West', 0, 20)];
      const stairs = _createStairs(stairRect, exits);

      const waypoints = generateWaypoints(ROOM_ID, stairRect, exits, stairs);
      const landingWaypoint = _findWaypointNear(waypoints, 2.5, 20, WAYPOINT_MIDDLE_ROW_Z);
      const topFrontWaypoint = _findWaypointNear(waypoints, 2.5, 20, WAYPOINT_FRONT_ROW_Z);
      const topFrontEdgeWaypoint = _findWaypointNear(waypoints, 5, 20, WAYPOINT_FRONT_ROW_Z);

      expect(landingWaypoint).toBeDefined();
      expect(topFrontWaypoint).toBeDefined();
      expect(topFrontEdgeWaypoint).toBeDefined();
      expect(landingWaypoint?.adjacentWaypoints.map(waypoint => waypoint.position)).toEqual(expect.arrayContaining([
        { x:0, y:20, z:WAYPOINT_MIDDLE_ROW_Z },
        { x:2.5, y:20, z:WAYPOINT_FRONT_ROW_Z }
      ]));
      expect(topFrontWaypoint?.adjacentWaypoints.map(waypoint => waypoint.position)).toEqual(expect.arrayContaining([
        { x:2.5, y:20, z:WAYPOINT_MIDDLE_ROW_Z },
        { x:5, y:20, z:WAYPOINT_FRONT_ROW_Z }
      ]));
    });

    it('connects winding mid-story waypoints across the back and front rows', () => {
      const stairRect = { x:0, y:0, width:20, height:40 };
      const exits = [_createExit('West', 0, 20)];
      const stairs = _createStairs(stairRect, exits);

      const waypoints = generateWaypoints(ROOM_ID, stairRect, exits, stairs);
      const backMidWaypoint = _findWaypointNear(waypoints, 15, 30, WAYPOINT_BACK_ROW_Z);
      const frontMidWaypoint = _findWaypointNear(waypoints, 15, 30, WAYPOINT_FRONT_ROW_Z);

      expect(backMidWaypoint).toBeDefined();
      expect(frontMidWaypoint).toBeDefined();
      expect(backMidWaypoint?.adjacentWaypoints.map(waypoint => waypoint.position)).toEqual(expect.arrayContaining([
        { x:5, y:39.999, z:WAYPOINT_BACK_ROW_Z },
        { x:15, y:30, z:WAYPOINT_FRONT_ROW_Z }
      ]));
    });

    it('connects continued winding stories through the top middle waypoint', () => {
      const stairRect = { x:0, y:0, width:20, height:60 };
      const exits = [_createExit('West', 0, 20)];
      const stairs = _createStairs(stairRect, exits);

      const waypoints = generateWaypoints(ROOM_ID, stairRect, exits, stairs);
      const firstStoryTopMiddleWaypoint = _findWaypointNear(waypoints, 2.5, 40, WAYPOINT_MIDDLE_ROW_Z);
      const secondStoryBottomBackWaypoint = _findWaypointNear(waypoints, 2.5, 40, WAYPOINT_BACK_ROW_Z);

      expect(firstStoryTopMiddleWaypoint).toBeDefined();
      expect(secondStoryBottomBackWaypoint).toBeDefined();
      expect(firstStoryTopMiddleWaypoint?.adjacentWaypoints.map(waypoint => waypoint.position)).toEqual(expect.arrayContaining([
        { x:2.5, y:40, z:WAYPOINT_BACK_ROW_Z }
      ]));
    });

    it('connects a floor stair start to both equally near floor waypoints', () => {
      const rect = { x:0, y:0, width:40, height:20 };
      const stairs:StairFlight[] = [{
        startPosition:{ x:10, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:BACK_ROW_Z },
        endPosition:{ x:0, y:10, z:BACK_ROW_Z }
      }];

      const waypoints = generateWaypoints(ROOM_ID, rect, [], stairs);
      const stairStartWaypoint = _findWaypointNear(waypoints, 10, 20 - FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_BACK_ROW_Z);

      expect(stairStartWaypoint).toBeDefined();
      expect(stairStartWaypoint?.adjacentWaypoints.map(waypoint => waypoint.position)).toEqual(expect.arrayContaining([
        { x:7.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_BACK_ROW_Z },
        { x:12.5, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:WAYPOINT_BACK_ROW_Z },
        { x:0, y:10, z:WAYPOINT_BACK_ROW_Z }
      ]));
    });

    it('creates direct stair landing waypoints on the back row for direct stairs', () => {
      const rect = { x:0, y:0, width:40, height:20 };
      const exits = [_createExit('West', 0, 5)];
      const stairs = _createStairs(rect, exits);

      const waypoints = generateWaypoints(ROOM_ID, rect, exits, stairs);

      expect(_findWaypointNear(waypoints, 5, 5, WAYPOINT_BACK_ROW_Z)).toBeDefined();
      expect(_findWaypointNear(waypoints, 5, 5, WAYPOINT_MIDDLE_ROW_Z)).toBeUndefined();
    });

    it('connects a direct stair landing waypoint to the exit and stair start on the back row', () => {
      const rect = { x:0, y:0, width:40, height:20 };
      const exits = [_createExit('West', 0, 5)];
      const stairs = _createStairs(rect, exits);

      const waypoints = generateWaypoints(ROOM_ID, rect, exits, stairs);
      const landingWaypoint = _findWaypointNear(waypoints, 5, 5, WAYPOINT_BACK_ROW_Z);

      expect(landingWaypoint).toBeDefined();
      expect(landingWaypoint?.adjacentWaypoints.map(waypoint => waypoint.position)).toEqual(expect.arrayContaining([
        { x:0, y:5, z:WAYPOINT_MIDDLE_ROW_Z },
        expect.objectContaining({ x:expect.closeTo(19.999, 3), y:expect.closeTo(19.999, 3), z:WAYPOINT_BACK_ROW_Z })
      ]));
    });

    it('omits spine waypoints when all exits are on the floor', () => {
      const exits = [
        _createExit('West', 0, ROOM_RECT.y + ROOM_RECT.height - FLOOR_WAYPOINT_Y_OFFSET),
        _createExit('East', 20, ROOM_RECT.y + ROOM_RECT.height - FLOOR_WAYPOINT_Y_OFFSET)
      ];

      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, exits);

      expect(_findWaypoint(waypoints, 7.5, 6)).toBeUndefined();
      expect(_findWaypoint(waypoints, 0, 20 - FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z)).toBeDefined();
      expect(_findWaypoint(waypoints, 20, 20 - FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z)).toBeDefined();
      expect(waypoints.every(waypoint => waypoint.position.y === 20 - FLOOR_WAYPOINT_Y_OFFSET)).toBe(true);
    });

    it('prefers stepping onto or continuing on the middle row when routing to a floor exit', () => {
      const exits = [_createExit('East', 20, ROOM_RECT.y + ROOM_RECT.height - FLOOR_WAYPOINT_Y_OFFSET)];
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, exits);
      const backRowStartWaypoint = _findWaypoint(waypoints, 7.5, 20 - FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_BACK_ROW_Z);
      const middleRowStartWaypoint = _findWaypoint(waypoints, 7.5, 20 - FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z);

      expect(backRowStartWaypoint).toBeDefined();
      expect(middleRowStartWaypoint).toBeDefined();
      expect(backRowStartWaypoint?.exitDirections.East?.position.z).toBe(WAYPOINT_MIDDLE_ROW_Z);
      expect(middleRowStartWaypoint?.exitDirections.East?.position.z).toBe(WAYPOINT_MIDDLE_ROW_Z);
    });

    it('creates exit routes for rooms whose exits are reachable by stair and landing waypoints', () => {
      const stairRect = { x:0, y:0, width:20, height:40 };
      const exits = [
        _createExit('West', 0, 20),
        _createExit('East', 20, 20),
        _createExit('West 2', 0, 20),
        _createExit('East 2', 20, 20)
      ];
      const stairs = _createStairs(stairRect, exits);
      const waypoints = generateWaypoints(ROOM_ID, stairRect, exits, stairs);

      _assertAllWaypointsAreInsideRoomRect(waypoints, stairRect);
      _assertAllWaypointsHaveNeighbors(waypoints);
      exits.forEach(exit => {
        const adjacentRoomId = exit.room2Id;
        const exitWaypoint = findExitWaypoint(ROOM_ID, stairRect, exit, waypoints);
        expect(exitWaypoint.adjacentWaypoints.length).toBeGreaterThan(0);
        waypoints
          .filter(waypoint => waypoint !== exitWaypoint)
          .forEach(waypoint => _assertExitRouteTerminates(exitWaypoint, waypoint, adjacentRoomId));
      });
    });

    it('creates exit routes when the room id is the second side of an exit', () => {
      const stairRect = { x:0, y:0, width:20, height:40 };
      const exits:RoomExit[] = [{
        id:createRoomExitId('West', ROOM_ID, 0, 20),
        room1Id:'West',
        room2Id:ROOM_ID,
        x:0,
        y:20,
        exitType:ExitType.doorway,
        lockableFromRoom1With:null,
        lockableFromRoom2With:null,
        exitStatus:ExitStatus.open
      }];
      const stairs = _createStairs(stairRect, exits);
      const waypoints = generateWaypoints(ROOM_ID, stairRect, exits, stairs);
      const exitWaypoint = findExitWaypoint(ROOM_ID, stairRect, exits[0], waypoints);

      waypoints
        .filter(waypoint => waypoint !== exitWaypoint)
        .forEach(waypoint => _assertExitRouteTerminates(exitWaypoint, waypoint, 'West'));
    });

    it('reuses one landing waypoint for multiple exits at the same height', () => {
      const stairRect = { x:0, y:0, width:20, height:40 };
      const exits = [
        _createExit('West', 0, 20),
        _createExit('East', 20, 20)
      ];
      const stairs = _createStairs(stairRect, exits);
      const waypoints = generateWaypoints(ROOM_ID, stairRect, exits, stairs);

      expect(waypoints.filter(waypoint => _findWaypointNear([waypoint], 2.5, 20, WAYPOINT_MIDDLE_ROW_Z))).toHaveLength(1);
    });

    it('connects each same-height exit to the nearest stair flight', () => {
      const rect = { x:0, y:0, width:30, height:20 };
      const exits = [
        _createExit('Left', 0, 10),
        _createExit('Right', 30, 10)
      ];
      const stairs:StairFlight[] = [
        {
          startPosition:{ x:10, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:BACK_ROW_Z },
          endPosition:{ x:5, y:5, z:BACK_ROW_Z }
        },
        {
          startPosition:{ x:20, y:20 - FLOOR_WAYPOINT_Y_OFFSET, z:BACK_ROW_Z },
          endPosition:{ x:25, y:5, z:BACK_ROW_Z }
        }
      ];

      const waypoints = generateWaypoints(ROOM_ID, rect, exits, stairs);

      expect(_findWaypointNear(waypoints, 6.667, 10)).toBeDefined();
      expect(_findWaypointNear(waypoints, 23.333, 10)).toBeDefined();

      const rightExitWaypoint = findExitWaypoint(ROOM_ID, rect, exits[1], waypoints);
      expect(rightExitWaypoint.adjacentWaypoints.map(waypoint => waypoint.position)).toEqual(expect.arrayContaining([
        expect.objectContaining({ x:expect.closeTo(23.333, 3), y:10 })
      ]));
    });

    it('asserts when asked to generate waypoints for a ceiling exit', () => {
      const exits = [_createExit('North', 10, 0)];

      expect(() => generateWaypoints(ROOM_ID, ROOM_RECT, exits)).toThrow(/ceiling exits are not supported/i);
    });
  });
});
