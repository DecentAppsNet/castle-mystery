// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createObstruction, isPositionInObstructions } from '../obstructionUtil';
import { calcRoomsBoundingRect, findCharactersInRoom, findExitWaypoint, findNearestWaypoint, findRoom, findRoomAtPosition, findRoomNearestToPosition, generateWaypoints } from '../roomUtil';
import Obstruction from '../types/Obstruction';
import Character from '../types/Character';
import Rect from '../types/Rect';
import Room from '../types/Room';
import ExitStatus from '../types/ExitStatus';
import ExitType from '../types/ExitType';
import RoomExit, { createRoomExitId } from '../types/RoomExit';
import Waypoint from '../types/Waypoint';

const ROOM_ID = 'Room';
const ROOM_RECT:Rect = { x:0, y:0, width:20, height:20 };

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
    id,
    title:id,
    rect,
    items:[],
    obstructions:[],
    exits,
    waypoints,
    positionMarkersById:{},
    isDiscovered:false,
    isObscured:false
  };
}

function _createCharacter(id:string, x:number, y:number):Character {
  const waypoint:Waypoint = { position:{ x, y }, adjacentWaypoints:[], exitDirections:{} };
  return {
    id,
    title:id,
    randomSalt:0,
    isTitleKnown:true,
    description:id,
    items:[],
    x,
    y,
    waypoint,
    faceImageUrl:null,
    itinerary:[],
    itineraryIndex:{ eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] }
  };
}

function _createWaypoint(x:number, y:number):Waypoint {
  return { position:{ x, y }, adjacentWaypoints:[], exitDirections:{} };
}

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y}`;
}

function _assertAllWaypointsHaveNeighbors(waypoints:Waypoint[]) {
  waypoints.forEach(waypoint => {
    expect(waypoint.adjacentWaypoints.length).toBeGreaterThan(0);
  });
}

function _assertAllWaypointsAreInsideRoomRect(waypoints:Waypoint[], roomRect:Rect) {
  waypoints.forEach(waypoint => {
    expect(waypoint.position.x).toBeGreaterThanOrEqual(roomRect.x);
    expect(waypoint.position.x).toBeLessThan(roomRect.x + roomRect.width);
    expect(waypoint.position.y).toBeGreaterThanOrEqual(roomRect.y);
    expect(waypoint.position.y).toBeLessThan(roomRect.y + roomRect.height);
  });
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

  describe('findExitWaypoint()', () => {
    it('returns the waypoint positioned at the in-room side of an exit', () => {
      const exit = _createExit('North', 10, 0);
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, [exit], []);

      const exitWaypoint = findExitWaypoint(ROOM_ID, ROOM_RECT, exit, waypoints);

      expect(exitWaypoint.position).toEqual({ x:10, y:5 });
      expect(waypoints).toContain(exitWaypoint);
    });

    it('throws when the waypoint collection does not contain the exit waypoint', () => {
      const exit = _createExit('North', 10, 0);

      expect(() => findExitWaypoint(ROOM_ID, ROOM_RECT, exit, [])).toThrow(/missing exit waypoint/i);
    });

    it('throws when the exit is not on the room boundary', () => {
      const invalidExit = _createExit('North', 10, 10);

      expect(() => findExitWaypoint(ROOM_ID, ROOM_RECT, invalidExit, [])).toThrow(/not on the boundary/i);
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
    it('creates a fully connected waypoint grid for a simple room with no obstructions and no exits', () => {
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, [], []);

      expect(waypoints).toHaveLength(16);
      _assertAllWaypointsAreInsideRoomRect(waypoints, ROOM_RECT);
      _assertAllWaypointsHaveNeighbors(waypoints);
    });

    it('omits obstructed positions while keeping the remaining waypoints connected', () => {
      const unobstructedWaypoints = generateWaypoints(ROOM_ID, ROOM_RECT, [], []);
      const obstructions:Obstruction[] = [createObstruction([{ x:6, y:6, width:5, height:5 }])];
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, [], obstructions);

      expect(waypoints.length).toBeGreaterThan(0);
      expect(waypoints.length).toBeLessThan(unobstructedWaypoints.length);
      _assertAllWaypointsAreInsideRoomRect(waypoints, ROOM_RECT);
      waypoints.forEach(waypoint => {
        expect(isPositionInObstructions(waypoint.position.x, waypoint.position.y, obstructions)).toBe(false);
      });
      _assertAllWaypointsHaveNeighbors(waypoints);
    });

    it('creates exit routes for rooms whose exits are reachable by waypoints', () => {
      const exits = [
        _createExit('North', 10, 0),
        _createExit('South', 10, 20),
        _createExit('West', 0, 10),
        _createExit('East', 20, 10)
      ];
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, exits, []);

      _assertAllWaypointsAreInsideRoomRect(waypoints, ROOM_RECT);
      _assertAllWaypointsHaveNeighbors(waypoints);
      exits.forEach(exit => {
        const adjacentRoomId = exit.room2Id;
        const exitWaypoint = findExitWaypoint(ROOM_ID, ROOM_RECT, exit, waypoints);
        expect(exitWaypoint.adjacentWaypoints.length).toBeGreaterThan(0);
        waypoints
          .filter(waypoint => waypoint !== exitWaypoint)
          .forEach(waypoint => _assertExitRouteTerminates(exitWaypoint, waypoint, adjacentRoomId));
      });
    });

    it('creates exit routes when the room id is the second side of an exit', () => {
      const exits:RoomExit[] = [{
        id:createRoomExitId('North', ROOM_ID, 10, 0),
        room1Id:'North',
        room2Id:ROOM_ID,
        x:10,
        y:0,
        exitType:ExitType.doorway,
        lockableFromRoom1With:null,
        lockableFromRoom2With:null,
        exitStatus:ExitStatus.open
      }];
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, exits, []);
      const exitWaypoint = findExitWaypoint(ROOM_ID, ROOM_RECT, exits[0], waypoints);

      waypoints
        .filter(waypoint => waypoint !== exitWaypoint)
        .forEach(waypoint => _assertExitRouteTerminates(exitWaypoint, waypoint, 'North'));
    });

    it('reuses an existing waypoint when exit alignment already creates the same position', () => {
      const exits = [
        _createExit('North', 5, 0),
        _createExit('West', 0, 10)
      ];
      const waypoints = generateWaypoints(ROOM_ID, ROOM_RECT, exits, []);

      expect(waypoints.filter(waypoint => waypoint.position.x === 5 && waypoint.position.y === 10)).toHaveLength(1);
    });

    it('throws when an exit waypoint is not reachable from any other waypoint', () => {
      const exits = [_createExit('West', 0, 10)];
      const obstructions:Obstruction[] = [
        createObstruction([{ x:0, y:0, width:4, height:20 }]),
        createObstruction([{ x:6, y:0, width:4, height:20 }])
      ];

      expect(() => generateWaypoints(ROOM_ID, ROOM_RECT, exits, obstructions)).toThrow(/has no connected waypoint/i);
    });

    it('throws when an exit waypoint would be obstructed', () => {
      const exits = [_createExit('West', 0, 10)];
      const obstructions:Obstruction[] = [createObstruction([{ x:4, y:9, width:3, height:3 }])];

      expect(() => generateWaypoints(ROOM_ID, ROOM_RECT, exits, obstructions)).toThrow(/is obstructed/i);
    });

    it('throws when a room has no connected waypoints after obstruction filtering', () => {
      const obstructions:Obstruction[] = [createObstruction([{ x:0, y:0, width:20, height:20 }])];

      expect(() => generateWaypoints(ROOM_ID, ROOM_RECT, [], obstructions)).toThrow(/has no connected waypoints/i);
    });
  });
});
