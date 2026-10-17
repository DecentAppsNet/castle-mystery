import { describe, expect, it } from 'vitest';

import { findCharacterPositionAtTime, findRoomNavigationTarget } from '@/game/timeline';
import { findRoomAtPosition } from '@/game/roomUtil';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import roomTraversalText from '@/game/__tests__/fixtures/room-traversal.md?raw';
import roomNavigationCharactersText from './fixtures/room-navigation-characters.md?raw';

type RoomVisit = { time:number, roomId:string };
type CharacterRoomVisits = { time:number, roomIds:string[] };

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

function _createResolverScenario(visits:CharacterRoomVisits[]) {
  // Keep real loaded identities and geometry while controlling each character's schedule.
  const level = loadValidLevelForTest(roomNavigationCharactersText, 'room-navigation-characters.md');
  const initialKeyframe = level.timeline.keyframes[0];
  const keyframes = visits.map(({ time, roomIds }) => ({
    ...initialKeyframe,
    time,
    characters:roomIds.map((roomId, characterI) => {
      const room = level.rooms.find(candidate => candidate.id === roomId)!;
      const position = { x:room.rect.x + room.rect.width / 2, y:room.rect.y + room.rect.height / 2, z:0 };
      return { ...initialKeyframe.characters[characterI], position };
    })
  }));

  // Preserve the loader's base-character order and identity-to-index lookup.
  return {
    rooms:level.rooms,
    timeline:{ ...level.timeline, keyframes, startTime:keyframes[0].time, endTime:keyframes[keyframes.length - 1].time }
  };
}

describe('roomNavigationUtil', () => {
  describe('single-character destinations', () => {
    it('returns null when the character never visits the target room', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'west' }]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'center', 2000)).toBeNull();
    });

    it('returns the current time for a character already occupying the room', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'west' }]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'west', 2000)).toEqual({ characterId:'sam', time:2000 });
    });

    it('recognizes current occupancy through interpolation rather than the preceding keyframe', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'center', 2000)).toEqual({ characterId:'sam', time:2000 });
    });

    it('does not treat the preceding keyframe room as current occupancy after moving out of it', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'west', 2000)).toEqual({ characterId:'sam', time:1000 });
    });

    it('returns a past-only candidate at the immediate preceding keyframe', () => {
      const { timeline, rooms } = _createScenario([
        { time:1000, roomId:'west' }, { time:2000, roomId:'west' }, { time:3000, roomId:'east' }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'west', 2750)).toEqual({ characterId:'sam', time:2000 });
    });

    it('returns a future-only crossing candidate', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'east', 1000)).toEqual({ characterId:'sam', time:2750 });
    });

    it('chooses the past when it is closer than a future visit', () => {
      const { timeline, rooms } = _createScenario([
        { time:2000, roomId:'west' }, { time:3000, roomId:'east' }, { time:7000, roomId:'west' }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'west', 3000)).toEqual({ characterId:'sam', time:2000 });
    });

    it('chooses the future when it is closer than a past visit', () => {
      const { timeline, rooms } = _createScenario([
        { time:1000, roomId:'west' }, { time:5000, roomId:'east' }, { time:6000, roomId:'west' }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'west', 5000)).toEqual({ characterId:'sam', time:5875 });
    });

    it('prefers the future when past and future candidates are equally distant', () => {
      const { timeline, rooms } = _createScenario([
        { time:1000, roomId:'west' }, { time:2000, roomId:'east' }, { time:6000, roomId:'west' }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'west', 3250)).toEqual({ characterId:'sam', time:5500 });
    });

    it('returns an interior sample for a rightward transit-only room', () => {
      const { timeline, rooms } = _createScenario([{ time:0, roomId:'west' }, { time:4000, roomId:'east' }]);

      const target = findRoomNavigationTarget(timeline, rooms, 'sam', 'center', 0);
      const position = findCharacterPositionAtTime(timeline.keyframes, 0, target!.time);

      expect(target).toEqual({ characterId:'sam', time:2000 });
      expect(findRoomAtPosition(rooms, position.x, position.y)?.id).toBe('center');
    });

    it('returns an interior sample rather than the neighboring boundary for a leftward transit-only room', () => {
      const { timeline, rooms } = _createScenario([{ time:0, roomId:'east' }, { time:4000, roomId:'west' }]);

      const target = findRoomNavigationTarget(timeline, rooms, 'sam', 'center', 0);
      const position = findCharacterPositionAtTime(timeline.keyframes, 0, target!.time);

      expect(target).toEqual({ characterId:'sam', time:2000 });
      expect(findRoomAtPosition(rooms, position.x, position.y)?.id).toBe('center');
    });

    it('includes a target-room keyframe at the timeline start', () => {
      const { timeline, rooms } = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);

      expect(findRoomNavigationTarget(timeline, rooms, 'sam', 'west', 3000)).toEqual({ characterId:'sam', time:timeline.startTime });
    });

    it('includes the timeline end even when it is the first instant inside the target room', () => {
      const scenario = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);
      const timeline = { ...scenario.timeline, endTime:2500 };

      expect(findRoomNavigationTarget(timeline, scenario.rooms, 'sam', 'east', 1000)).toEqual({ characterId:'sam', time:2500 });
    });

    it('excludes visits before the timeline start', () => {
      const scenario = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);
      const timeline = { ...scenario.timeline, startTime:2500 };

      expect(findRoomNavigationTarget(timeline, scenario.rooms, 'sam', 'west', 3000)).toBeNull();
    });

    it('excludes visits after the timeline end', () => {
      const scenario = _createScenario([{ time:1000, roomId:'west' }, { time:3000, roomId:'east' }]);
      const timeline = { ...scenario.timeline, endTime:2000 };

      expect(findRoomNavigationTarget(timeline, scenario.rooms, 'sam', 'east', 1000)).toBeNull();
    });

    it('samples a clipped leftward interval without rounding a fractional time onto its entry boundary', () => {
      const scenario = _createScenario([{ time:1000, roomId:'east' }, { time:1001, roomId:'west' }]);
      const timeline = { ...scenario.timeline, startTime:1000.25, endTime:1000.5 };

      const target = findRoomNavigationTarget(timeline, scenario.rooms, 'sam', 'center', 1000.25);
      const position = findCharacterPositionAtTime(timeline.keyframes, 0, target!.time);

      expect(target).toEqual({ characterId:'sam', time:1000.375 });
      expect(findRoomAtPosition(scenario.rooms, position.x, position.y)?.id).toBe('center');
    });
  });

  describe('findRoomNavigationTarget()', () => {
    it('prefers the active character even when another character occupies the room now', () => {
      const { timeline, rooms } = _createResolverScenario([
        { time:0, roomIds:['west', 'east', 'west'] },
        { time:4000, roomIds:['east', 'east', 'west'] }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'active', 'east', 0)).toEqual({ characterId:'active', time:3500 });
    });

    it('keeps an active-character candidate at time zero', () => {
      const { timeline, rooms } = _createResolverScenario([{ time:0, roomIds:['east', 'east', 'east'] }]);

      expect(findRoomNavigationTarget(timeline, rooms, 'active', 'east', 0)).toEqual({ characterId:'active', time:0 });
    });

    it('chooses the nearest fallback character rather than the first character with a visit', () => {
      const { timeline, rooms } = _createResolverScenario([
        { time:0, roomIds:['west', 'east', 'west'] },
        { time:4000, roomIds:['west', 'west', 'east'] }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'active', 'east', 2500)).toEqual({ characterId:'second', time:3500 });
    });

    it('uses interpolated current occupancy for a fallback without a time jump', () => {
      const { timeline, rooms } = _createResolverScenario([
        { time:0, roomIds:['west', 'east', 'west'] },
        { time:4000, roomIds:['west', 'west', 'east'] }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'active', 'east', 3000)).toEqual({ characterId:'second', time:3000 });
    });

    it('retains base-character order on ties even when a later character has a future candidate', () => {
      const { timeline, rooms } = _createResolverScenario([
        { time:0, roomIds:['west', 'east', 'west'] },
        { time:4000, roomIds:['west', 'west', 'east'] }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'active', 'east', 1750)).toEqual({ characterId:'first', time:0 });
    });

    it('returns base identity rather than a skin identifier belonging to another character', () => {
      const { timeline, rooms } = _createResolverScenario([{ time:0, roomIds:['west', 'east', 'west'] }]);
      timeline.keyframes[0].characters[1].skinId = 'second';

      expect(findRoomNavigationTarget(timeline, rooms, 'active', 'east', 0)).toEqual({ characterId:'first', time:0 });
    });

    it('finds the active character by identity when its index is not zero', () => {
      const { timeline, rooms } = _createResolverScenario([{ time:0, roomIds:['west', 'east', 'west'] }]);

      expect(findRoomNavigationTarget(timeline, rooms, 'first', 'east', 0)).toEqual({ characterId:'first', time:0 });
    });

    it('returns null normally when no character has a target-room candidate', () => {
      const { timeline, rooms } = _createResolverScenario([
        { time:0, roomIds:['west', 'west', 'west'] },
        { time:4000, roomIds:['west', 'west', 'west'] }
      ]);

      expect(findRoomNavigationTarget(timeline, rooms, 'active', 'east', 2000)).toBeNull();
    });
  });
});