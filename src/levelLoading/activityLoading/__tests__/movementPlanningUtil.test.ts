import { describe, expect, it } from 'vitest';

import { createDefaultCharacter } from '@/game/types/Character';
import { FLOOR_WAYPOINT_Y_OFFSET } from '@/game/roomSpaceConstants';
import { createDefaultRoom } from '@/game/types/Room';
import { createEditableTimeline } from '@/levelLoading/timelineLoading/editingUtil';
import WaypointGenerationContext from '@/levelLoading/types/WaypointGenerationContext';
import Waypoint from '@/levelLoading/types/Waypoint';
import { scheduleCharacterMovementToRoom, scheduleCharacterMovementWithinRoom } from '../movementPlanningUtil';

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

    it('records the actual interval without changing movement timing or destination', () => {
      const timeline = _createTimeline();
      const destination = { x:5, y:FLOOR_Y, z:0 };
      const duration = scheduleCharacterMovementWithinRoom(_createContext(), ROOM,
        { x:0, y:FLOOR_Y, z:0 }, 100, destination, 0, 'right', timeline);

      expect(duration).toBeGreaterThan(0);
      expect(timeline.pendingWalkingIntervals).toEqual([{ characterI:0, startTime:100, endTime:100 + duration }]);
      expect(timeline.keyframes.at(-1)).toMatchObject({ time:100 + duration, characters:[{ position:destination }] });
    });

    it('does not record a walk for an unchanged position', () => {
      const timeline = _createTimeline();
      const position = { x:0, y:FLOOR_Y, z:0 };
      const duration = scheduleCharacterMovementWithinRoom(_createContext(), ROOM,
        position, 100, position, 0, 'right', timeline);

      expect(duration).toBe(0);
      expect(timeline.pendingWalkingIntervals).toEqual([]);
    });

    it('records touching calls separately for later coalescing', () => {
      const timeline = _createTimeline();
      const context = _createContext();
      const origin = { x:0, y:FLOOR_Y, z:0 };
      const destination = { x:5, y:FLOOR_Y, z:0 };
      const outward = scheduleCharacterMovementWithinRoom(context, ROOM, origin, 100,
        destination, 0, 'right', timeline);
      const returning = scheduleCharacterMovementWithinRoom(context, ROOM, destination, 100 + outward,
        origin, 0, 'right', timeline);

      expect(timeline.pendingWalkingIntervals).toEqual([
        { characterI:0, startTime:100, endTime:100 + outward },
        { characterI:0, startTime:100 + outward, endTime:100 + outward + returning }
      ]);
    });

    it('keeps pending intervals independent between timelines and initial placement effect-free', () => {
      const first = _createTimeline();
      const second = _createTimeline();
      expect(first.pendingWalkingIntervals).toEqual([]);
      expect(first.pendingWalkingIntervals).not.toBe(second.pendingWalkingIntervals);

      scheduleCharacterMovementWithinRoom(_createContext(), ROOM, { x:0, y:FLOOR_Y, z:0 }, 100,
        { x:5, y:FLOOR_Y, z:0 }, 0, 'right', first);

      expect(first.pendingWalkingIntervals).toHaveLength(1);
      expect(second.pendingWalkingIntervals).toEqual([]);
    });
  });

  describe('scheduleCharacterMovementToRoom()', () => {
    it('keys standing only on the first added character keyframe', () => {
      const timeline = _createTimeline();
      scheduleCharacterMovementToRoom(_createContext(), ROOM, { x:0, y:FLOOR_Y, z:0 }, 100,
        OTHER_ROOM, { x:15, y:FLOOR_Y, z:0 }, 0, 'right', timeline);
      _expectOnlyFirstAddedKeyframeStands(timeline);
    });

    it('records one interval across multiple segments and a room crossing', () => {
      const timeline = _createTimeline();
      const context = _createContext();
      context.waypoints[1].position.z = 1;
      const destination = { x:15, y:FLOOR_Y, z:0 };
      const duration = scheduleCharacterMovementToRoom(context, ROOM, { x:0, y:FLOOR_Y, z:0 }, 100,
        OTHER_ROOM, destination, 0, 'right', timeline);

      expect(timeline.keyframes.some(frame => frame.characters[0].position.z === 1)).toBe(true);
      expect(timeline.pendingWalkingIntervals).toEqual([{ characterI:0, startTime:100, endTime:100 + duration }]);
      expect(timeline.keyframes.at(-1)).toMatchObject({ time:100 + duration, characters:[{ position:destination }] });
    });

    it('does not record a walk when already at the destination', () => {
      const timeline = _createTimeline();
      const position = { x:0, y:FLOOR_Y, z:0 };
      const duration = scheduleCharacterMovementToRoom(_createContext(), ROOM, position, 100,
        ROOM, position, 0, 'right', timeline);

      expect(duration).toBe(0);
      expect(timeline.pendingWalkingIntervals).toEqual([]);
    });
  });
});
