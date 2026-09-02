import { describe, expect, it } from 'vitest';

import { FLOOR_WAYPOINT_Y_OFFSET } from '@/game/roomSpaceConstants';
import { createDefaultCharacterKeyframe } from '@/game/types/CharacterKeyframe';
import ExitStatus from '@/game/types/ExitStatus';
import ExitType from '@/game/types/ExitType';
import { createDefaultItem } from '@/game/types/Item';
import Room, { createDefaultRoom } from '@/game/types/Room';
import RoomExit from '@/game/types/RoomExit';
import TimelineKeyframe from '@/game/types/TimelineKeyframe';
import WaypointGenerationContext from '@/levelLoading/types/WaypointGenerationContext';
import Waypoint from '@/levelLoading/types/Waypoint';
import {
  calcExitWaypointY,
  calcLandingWaypointY,
  findExitWaypoint,
  findClaimedWaypointsFromKeyframe,
  findNearestFloorWaypointToPosition,
  findNearestIncludedFloorWaypointToPosition,
  findWaypointsForRoom,
  isExitWaypoint,
  isFloorWaypoint,
  WAYPOINT_BACK_ROW_Z,
  WAYPOINT_FRONT_ROW_Z,
  WAYPOINT_MIDDLE_ROW_Z
} from '../waypointFindingUtil';

const FLOOR_Y = 20 - FLOOR_WAYPOINT_Y_OFFSET;

function _createExit():RoomExit {
  return {
    id:'room|other-room|20|20',
    x:20,
    y:20,
    room1Id:'room',
    room2Id:'other-room',
    exitType:ExitType.doorway,
    lockableFromRoom1With:null,
    lockableFromRoom2With:null,
    exitStatus:ExitStatus.open
  };
}

function _createRoom():Room {
  return {
    ...createDefaultRoom(),
    rect:{ x:0, y:0, width:20, height:20 },
    exits:[_createExit()]
  };
}

function _createWaypoint(x:number, y:number, z:number):Waypoint {
  return { roomId:'room', position:{ x, y, z }, adjacentWaypoints:[] };
}

function _createContext(waypoints:Waypoint[]):WaypointGenerationContext {
  return {
    waypoints,
    waypointsByRoomId:new Map([['room', waypoints]])
  };
}

function _createKeyframe(items:TimelineKeyframe['rooms'][number]['items'] = [],
    characters:TimelineKeyframe['characters'] = []):TimelineKeyframe {
  return { time:0, rooms:[{ items, exits:[] }], characters };
}

describe('waypointFindingUtil', () => {
  describe('calcLandingWaypointY()', () => {
    it('applies the floor waypoint offset', () => {
      expect(calcLandingWaypointY(20)).toBe(FLOOR_Y);
    });
  });

  describe('calcExitWaypointY()', () => {
    it('converts an exit architectural y to waypoint y', () => {
      expect(calcExitWaypointY(_createExit())).toBe(FLOOR_Y);
    });
  });

  describe('findExitWaypoint()', () => {
    it('returns the middle-row waypoint at the exit position', () => {
      const exitWaypoint = _createWaypoint(20, FLOOR_Y, WAYPOINT_MIDDLE_ROW_Z);
      const otherWaypoint = _createWaypoint(20, FLOOR_Y, WAYPOINT_BACK_ROW_Z);

      expect(findExitWaypoint('room', _createRoom().rect, _createExit(), [otherWaypoint, exitWaypoint])).toBe(exitWaypoint);
    });
  });

  describe('findWaypointsForRoom()', () => {
    it('returns the indexed waypoints for the requested room', () => {
      const waypoints = [_createWaypoint(5, FLOOR_Y, WAYPOINT_MIDDLE_ROW_Z)];

      expect(findWaypointsForRoom(_createContext(waypoints), 'room')).toBe(waypoints);
    });
  });

  describe('findNearestFloorWaypointToPosition()', () => {
    it('returns the floor waypoint nearest in x and z', () => {
      const nearest = _createWaypoint(10, FLOOR_Y, WAYPOINT_FRONT_ROW_Z);
      const farther = _createWaypoint(5, FLOOR_Y, WAYPOINT_BACK_ROW_Z);
      const nonFloor = _createWaypoint(10, 10, WAYPOINT_FRONT_ROW_Z);
      const context = _createContext([farther, nearest, nonFloor]);

      expect(findNearestFloorWaypointToPosition(context, _createRoom(), { x:9, y:0, z:WAYPOINT_FRONT_ROW_Z })).toBe(nearest);
    });
  });

  describe('findNearestIncludedFloorWaypointToPosition()', () => {
    it('omits excluded waypoints when finding the nearest floor waypoint', () => {
      const excluded = _createWaypoint(10, FLOOR_Y, WAYPOINT_FRONT_ROW_Z);
      const included = _createWaypoint(5, FLOOR_Y, WAYPOINT_FRONT_ROW_Z);
      const context = _createContext([excluded, included]);

      expect(findNearestIncludedFloorWaypointToPosition(
        context, _createRoom(), { x:10, y:0, z:WAYPOINT_FRONT_ROW_Z }, [excluded]
      )).toBe(included);
    });

    it('returns null when every floor waypoint is excluded', () => {
      const excluded = _createWaypoint(10, FLOOR_Y, WAYPOINT_FRONT_ROW_Z);

      expect(findNearestIncludedFloorWaypointToPosition(
        _createContext([excluded]), _createRoom(), { x:10, y:0, z:WAYPOINT_FRONT_ROW_Z }, [excluded]
      )).toBeNull();
    });
  });

  describe('isFloorWaypoint()', () => {
    it('identifies waypoints aligned with the room floor', () => {
      expect(isFloorWaypoint(_createRoom(), _createWaypoint(5, FLOOR_Y, WAYPOINT_BACK_ROW_Z))).toBe(true);
      expect(isFloorWaypoint(_createRoom(), _createWaypoint(5, 10, WAYPOINT_BACK_ROW_Z))).toBe(false);
    });
  });

  describe('isExitWaypoint()', () => {
    it('identifies middle-row waypoints at room exits', () => {
      expect(isExitWaypoint(_createRoom(), _createWaypoint(20, FLOOR_Y, WAYPOINT_MIDDLE_ROW_Z))).toBe(true);
      expect(isExitWaypoint(_createRoom(), _createWaypoint(20, FLOOR_Y, WAYPOINT_BACK_ROW_Z))).toBe(false);
    });
  });

  describe('findClaimedWaypointsFromKeyframe()', () => {
    it('excludes exit and non-floor waypoints', () => {
      const floorWaypoint = _createWaypoint(5, FLOOR_Y, WAYPOINT_BACK_ROW_Z);
      const exitWaypoint = _createWaypoint(20, FLOOR_Y, WAYPOINT_MIDDLE_ROW_Z);
      const nonFloorWaypoint = _createWaypoint(5, 10, WAYPOINT_BACK_ROW_Z);
      const context = _createContext([floorWaypoint, exitWaypoint, nonFloorWaypoint]);
      const items = [floorWaypoint, exitWaypoint, nonFloorWaypoint]
        .map(waypoint => ({ ...createDefaultItem(), position:waypoint.position }));

      expect(findClaimedWaypointsFromKeyframe(_createRoom(), 0, _createKeyframe(items), context)).toEqual([floorWaypoint]);
    });

    it('includes floor waypoints claimed by visible room items', () => {
      const claimed = _createWaypoint(5, FLOOR_Y, WAYPOINT_BACK_ROW_Z);
      const unclaimed = _createWaypoint(10, FLOOR_Y, WAYPOINT_BACK_ROW_Z);
      const item = { ...createDefaultItem(), position:claimed.position };
      const context = _createContext([claimed, unclaimed]);

      expect(findClaimedWaypointsFromKeyframe(
        _createRoom(), 0, _createKeyframe([item]), context
      )).toEqual([claimed]);
    });

    it('does not let invisible room items claim floor waypoints', () => {
      const waypoint = _createWaypoint(5, FLOOR_Y, WAYPOINT_BACK_ROW_Z);
      const item = { ...createDefaultItem(), isVisible:false, position:waypoint.position };

      expect(findClaimedWaypointsFromKeyframe(
        _createRoom(), 0, _createKeyframe([item]), _createContext([waypoint])
      )).toEqual([]);
    });

    it('includes floor waypoints claimed by visible characters', () => {
      const claimed = _createWaypoint(5, FLOOR_Y, WAYPOINT_BACK_ROW_Z);
      const unclaimed = _createWaypoint(10, FLOOR_Y, WAYPOINT_BACK_ROW_Z);
      const character = { ...createDefaultCharacterKeyframe(), position:claimed.position };
      const context = _createContext([claimed, unclaimed]);

      expect(findClaimedWaypointsFromKeyframe(
        _createRoom(), 0, _createKeyframe([], [character]), context
      )).toEqual([claimed]);
    });

    it('does not let invisible characters claim floor waypoints', () => {
      const waypoint = _createWaypoint(5, FLOOR_Y, WAYPOINT_BACK_ROW_Z);
      const character = { ...createDefaultCharacterKeyframe(), isVisible:false, position:waypoint.position };

      expect(findClaimedWaypointsFromKeyframe(
        _createRoom(), 0, _createKeyframe([], [character]), _createContext([waypoint])
      )).toEqual([]);
    });
  });
});
