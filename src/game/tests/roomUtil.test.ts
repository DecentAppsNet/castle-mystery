import { describe, expect, it } from 'vitest';

import { createObstruction, isPositionInObstructions } from '../obstructionUtil';
import { findCharactersInRoom, findExitWaypoint, findRoom, findRoomAtPosition, findRoomNearestToPosition, generateWaypoints } from '../roomUtil';
import Obstruction from '../types/Obstruction';
import Character from '../types/Character';
import Rect from '../types/Rect';
import Room from '../types/Room';
import RoomExit from '../types/RoomExit';
import Waypoint from '../types/Waypoint';

const ROOM_ID = 'Room';
const ROOM_RECT:Rect = { x:0, y:0, width:20, height:20 };

function _createExit(room2Id:string, x:number, y:number):RoomExit {
  return { room1Id:ROOM_ID, room2Id, x, y };
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
    isDiscovered:false
  };
}

function _createCharacter(id:string, x:number, y:number):Character {
  const waypoint:Waypoint = { position:{ x, y }, adjacentWaypoints:[], exitDirections:{} };
  return {
    id,
    description:id,
    items:[],
    x,
    y,
    waypoint,
    facingAngle:0,
    itinerary:[],
    itineraryIndex:{ eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] }
  };
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
      const library = _createRoom('Library', { x:20, y:0, width:20, height:20 });

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

    it('throws when an exit waypoint is not reachable from any other waypoint', () => {
      const exits = [_createExit('West', 0, 10)];
      const obstructions:Obstruction[] = [
        createObstruction([{ x:0, y:0, width:4, height:20 }]),
        createObstruction([{ x:6, y:0, width:4, height:20 }])
      ];

      expect(() => generateWaypoints(ROOM_ID, ROOM_RECT, exits, obstructions)).toThrow(/has no connected waypoint/i);
    });
  });
});
