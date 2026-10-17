import { describe, expect, it } from 'vitest';

import { findCharacterPositionAtTime, findCharacterRoomTime } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import roomTraversalText from '@/game/__tests__/fixtures/room-traversal.md?raw';

type RoomVisit = { time:number, roomId:string };

function _createScenario(visits:RoomVisit[]) {
  const level = loadValidLevelForTest(roomTraversalText, 'room-traversal.md');
  const initialKeyframe = level.timeline.keyframes[0];
  const keyframes = visits.map(({ time, roomId }) => {
    const room = level.rooms.find(candidate => candidate.id === roomId)!;
    const position = { x:room.rect.x + room.rect.width / 2, y:room.rect.y + room.rect.height / 2, z:0 };
    return { ...initialKeyframe, time, characters:[{ ...initialKeyframe.characters[0], position }] };
  });
  return {
    rooms:level.rooms,
    timeline:{ ...level.timeline, keyframes, startTime:keyframes[0].time, endTime:keyframes[keyframes.length - 1].time }
  };
}

describe('roomNavigationUtil', () => {
  describe('findCharacterRoomTime()', () => {
    it('returns null when the character never visits the target room', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'west' }]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'center', 2000)).toBeNull();
    });

    it('returns the current time for a character already occupying the room', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'west' }]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'west', 2000)).toBe(2000);
    });

    it('recognizes current occupancy through interpolation rather than the preceding keyframe', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'center', 2000)).toBe(2000);
    });

    it('does not treat the preceding keyframe room as current occupancy after moving out of it', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'west', 2000)).toBe(1000);
    });

    it('returns a past-only candidate at the immediate preceding keyframe', () => {
      const { timeline, rooms } = _createScenario([
        { time:1000, roomId:'west' }, { time:2000, roomId:'west' }, { time:3000, roomId:'east' }
      ]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'west', 2750)).toBe(2000);
    });

    it('returns a future-only crossing candidate', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'east', 1000)).toBe(2750);
    });

    it('chooses the past when it is closer than a future visit', () => {
      const { timeline, rooms } = _createScenario([
        { time:2000, roomId:'west' }, { time:3000, roomId:'east' }, { time:7000, roomId:'west' }
      ]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'west', 3000)).toBe(2000);
    });

    it('chooses the future when it is closer than a past visit', () => {
      const { timeline, rooms } = _createScenario([
        { time:1000, roomId:'west' }, { time:5000, roomId:'east' }, { time:6000, roomId:'west' }
      ]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'west', 5000)).toBe(5875);
    });

    it('prefers the future when past and future candidates are equally distant', () => {
      const { timeline, rooms } = _createScenario([
        { time:1000, roomId:'west' }, { time:2000, roomId:'east' }, { time:6000, roomId:'west' }
      ]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'west', 3250)).toBe(5500);
    });

    it('returns an interior sample for a rightward transit-only room', () => {
      const { timeline, rooms } = _createScenario([{ time:0, roomId:'west' }, { time:4000, roomId:'east' }]);

      const time = findCharacterRoomTime(timeline, rooms, 0, 'center', 0);
      const position = findCharacterPositionAtTime(timeline.keyframes, 0, time!);

      expect(time).toBe(2000);
      expect(findRoomAtPosition(rooms, position.x, position.y)?.id).toBe('center');
    });

    it('returns an interior sample rather than the neighboring boundary for a leftward transit-only room', () => {
      const { timeline, rooms } = _createScenario([{ time:0, roomId:'east' }, { time:4000, roomId:'west' }]);

      const time = findCharacterRoomTime(timeline, rooms, 0, 'center', 0);
      const position = findCharacterPositionAtTime(timeline.keyframes, 0, time!);

      expect(time).toBe(2000);
      expect(findRoomAtPosition(rooms, position.x, position.y)?.id).toBe('center');
    });

    it('includes a target-room keyframe at the timeline start', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);

      expect(findCharacterRoomTime(timeline, rooms, 0, 'west', 3000)).toBe(timeline.startTime);
    });

    it('includes the timeline end even when it is the first instant inside the target room', () => {
      const scenario = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);
      const timeline = { ...scenario.timeline, endTime:2500 };

      expect(findCharacterRoomTime(timeline, scenario.rooms, 0, 'east', 1000)).toBe(2500);
    });

    it('excludes visits before the timeline start', () => {
      const scenario = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);
      const timeline = { ...scenario.timeline, startTime:2500 };

      expect(findCharacterRoomTime(timeline, scenario.rooms, 0, 'west', 3000)).toBeNull();
    });

    it('excludes visits after the timeline end', () => {
      const scenario = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);
      const timeline = { ...scenario.timeline, endTime:2000 };

      expect(findCharacterRoomTime(timeline, scenario.rooms, 0, 'east', 1000)).toBeNull();
    });

    it('samples a clipped leftward interval without rounding a fractional time onto its entry boundary', () => {
      const scenario = _createScenario([{ time:1000, roomId:'east' }, { time:1001, roomId:'west' }]);
      const timeline = { ...scenario.timeline, startTime:1000.25, endTime:1000.5 };

      const time = findCharacterRoomTime(timeline, scenario.rooms, 0, 'center', 1000.25);
      const position = findCharacterPositionAtTime(timeline.keyframes, 0, time!);

      expect(time).toBe(1000.375);
      expect(findRoomAtPosition(scenario.rooms, position.x, position.y)?.id).toBe('center');
    });
  });
});