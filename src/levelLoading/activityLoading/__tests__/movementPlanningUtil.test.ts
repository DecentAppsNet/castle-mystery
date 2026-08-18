import { describe, expect, it } from 'vitest';

import { createDefaultCharacter } from '@/game/types/Character';
import { FLOOR_WAYPOINT_Y_OFFSET } from '@/game/roomSpaceConstants';
import { createDefaultRoom } from '@/game/types/Room';
import { createEditableTimeline } from '@/levelLoading/timelineLoading/editingUtil';
import WaypointGenerationContext from '@/levelLoading/types/WaypointGenerationContext';
import Waypoint from '@/levelLoading/types/Waypoint';
import {
  scheduleCharacterMovementToRoom,
  scheduleCharacterMovementToRoomAtTime,
  scheduleCharacterMovementWithinRoom
} from '../movementPlanningUtil';

const ROOM = { ...createDefaultRoom(), id:'room', rect:{ x:0, y:0, width:20, height:20 } };
const OTHER_ROOM = { ...createDefaultRoom(), id:'other-room', rect:{ x:20, y:0, width:20, height:20 } };
const FLOOR_Y = ROOM.rect.y + ROOM.rect.height - FLOOR_WAYPOINT_Y_OFFSET;

function _createWaypoint(roomId:string, x:number):Waypoint {
  return { roomId, position:{ x, y:FLOOR_Y, z:0 }, adjacentWaypoints:[] };
}

function _createContext():WaypointGenerationContext {
  const waypoints = [
    _createWaypoint(ROOM.id, 0),
    _createWaypoint(ROOM.id, 5),
    _createWaypoint(OTHER_ROOM.id, 10),
    _createWaypoint(OTHER_ROOM.id, 15)
  ];
  for (let i = 1; i < waypoints.length; ++i) {
    waypoints[i - 1].adjacentWaypoints.push(waypoints[i]);
    waypoints[i].adjacentWaypoints.push(waypoints[i - 1]);
  }
  return {
    waypoints,
    waypointsByRoomId:new Map([
      [ROOM.id, waypoints.slice(0, 2)],
      [OTHER_ROOM.id, waypoints.slice(2)]
    ])
  };
}

function _createTimeline() {
  const character = {
    ...createDefaultCharacter(),
    bodyOrientation:'sitting' as const,
    position:{ x:0, y:FLOOR_Y, z:0 }
  };
  return createEditableTimeline([character], [ROOM, OTHER_ROOM], 0);
}

function _expectOnlyFirstAddedKeyframeStands(timeline:ReturnType<typeof _createTimeline>):void {
  const addedCharacterKeyframes = timeline.editableKeyframes.slice(1).map(keyframe => keyframe.characters[0]);
  expect(addedCharacterKeyframes.length).toBeGreaterThan(1);
  expect(addedCharacterKeyframes[0].bodyOrientation).toBe('standing');
  expect(addedCharacterKeyframes.slice(1).every(keyframe => keyframe.bodyOrientation === undefined)).toBe(true);
}

describe('movementPlanningUtil', () => {
  describe('scheduleCharacterMovementWithinRoom()', () => {
    it('keys standing only on the first added character keyframe', () => {
      const timeline = _createTimeline();
      scheduleCharacterMovementWithinRoom(_createContext(), ROOM, { x:0, y:FLOOR_Y, z:0 }, 100,
        { x:5, y:FLOOR_Y, z:0 }, 0, 'right', timeline);
      _expectOnlyFirstAddedKeyframeStands(timeline);
    });
  });

  describe('scheduleCharacterMovementToRoom()', () => {
    it('keys standing only on the first added character keyframe', () => {
      const timeline = _createTimeline();
      scheduleCharacterMovementToRoom(_createContext(), ROOM, { x:0, y:FLOOR_Y, z:0 }, 100,
        OTHER_ROOM, { x:15, y:FLOOR_Y, z:0 }, 0, 'right', timeline);
      _expectOnlyFirstAddedKeyframeStands(timeline);
    });
  });

  describe('scheduleCharacterMovementToRoomAtTime()', () => {
    it('keys standing only on the first added character keyframe', () => {
      const timeline = _createTimeline();
      scheduleCharacterMovementToRoomAtTime(_createContext(), ROOM, { x:0, y:FLOOR_Y, z:0 }, 100,
        OTHER_ROOM, { x:15, y:FLOOR_Y, z:0 }, 2_000, 0, 'right', timeline);
      _expectOnlyFirstAddedKeyframeStands(timeline);
    });
  });
});
