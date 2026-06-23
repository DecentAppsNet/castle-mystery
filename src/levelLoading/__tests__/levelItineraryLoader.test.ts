// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it, vi } from 'vitest';

import { findCharacterPose } from '@/game/itineraryUtil';
import { createBodyOrientationEvent, createFaceEvent, createWalkEvent } from '@/game/itineraryUtil';
import baseLevelText from '@/game/__tests__/fixtures/timeline-start-time-field.md?raw';
import { ROOM_MIDDLE_ROW_CENTER_Z } from '@/game/roomSpaceConstants';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import * as activityMovementUtil from '../activities/activity/activityMovementUtil';
import { appendEventsToCharacterState, createCharacterActivityState, findStatePoseAtTime } from '../activities/activity/activityStateUtil';
import { parseItineraryActivities } from '../itineraryLoading/itineraryActivityParseUtil';
import { loadItineraries } from '../levelItineraryLoader';
import itineraryTimelineSummaryText from './fixtures/itinerary-timeline-summary.md?raw';

describe('levelItineraryLoader', () => {
  describe('loadItineraries()', () => {
    it('reports resolved timing summary for absolute and relative activities', () => {
      const level = loadLevelFromText(baseLevelText);
      const result = loadItineraries(level, itineraryTimelineSummaryText, 'itinerary-timeline-summary.md', 1);

      expect(result.resolvedTimeline.earliestAbsoluteActivityTime).toBe(10 * 60 * 60 * 1000 + 5 * 60 * 1000);
      expect(result.resolvedTimeline.earliestResolvedActivityTime).toBe(10 * 60 * 60 * 1000 + 5 * 60 * 1000);
      expect(result.resolvedTimeline.latestResolvedActivityEndTime).toBe(result.duration);
      expect(result.resolvedTimeline.latestResolvedEventEndTime).toBe(result.duration);
      expect(result.resolvedTimeline.latestResolvedActivityEndTime).toBeGreaterThanOrEqual(result.resolvedTimeline.earliestResolvedActivityTime || 0);
    });

    it('reports no resolved activity bounds when the itinerary is empty', () => {
      const level = loadLevelFromText(baseLevelText);
      const result = loadItineraries(level, '', 'empty-itinerary.md', 1);

      expect(result.resolvedTimeline.earliestAbsoluteActivityTime).toBe(null);
      expect(result.resolvedTimeline.earliestResolvedActivityTime).toBe(null);
      expect(result.resolvedTimeline.latestResolvedActivityEndTime).toBe(null);
      expect(result.resolvedTimeline.latestResolvedEventEndTime).toBe(null);
      expect(result.duration).toBe(0);
    });

    it('reuses the last file-ordered character and falls back to activeCharacter first', () => {
      const options = { isCrossMidnight:false, explicitEndTime:null };
      expect(parseItineraryActivities('0:00:05 says "Who am I?"', 'implicit-first.md', 1, options, 0, 'hero').map(a => a.characterId)).toEqual(['hero']);
      expect(parseItineraryActivities(['0:00:03 Steve @ Bakery', '0:00:05 faces right', '0:00:07 says "Boy, does it smell delicious in here!"', '0:00:06 Baker faces left'].join('\n'), 'implicit-followup.md', 1, options, 0, 'hero').map(a => a.characterId)).toEqual(['steve', 'steve', 'steve', 'baker']);
    });

    it('parses emits activities with an item subject while preserving the current scheduling character', () => {
      const options = { isCrossMidnight:false, explicitEndTime:null };
      const [activity] = parseItineraryActivities(['0:00:03 Niccollo @ Aviary', ': Furia Perched emits "(squawk)"'].join('\n'), 'item-emits.md', 1, options, 0, 'hero');
      const [, emitsActivity] = parseItineraryActivities(['0:00:03 Niccollo @ Aviary', ': Furia Perched emits "(squawk)"'].join('\n'), 'item-emits.md', 1, options, 0, 'hero');

      expect(activity.subjectKind).toBe('character');
      expect(activity.subjectId).toBe('niccollo');
      expect(emitsActivity.characterId).toBe('niccollo');
      expect(emitsActivity.subjectKind).toBe('item');
      expect(emitsActivity.subjectId).toBe('furia perched');
      expect(emitsActivity.activityText).toBe('emits "(squawk)"');
    });

    it('parses bare emits activities as implied-character activities', () => {
      const options = { isCrossMidnight:false, explicitEndTime:null };
      const [atActivity, emitsActivity] = parseItineraryActivities(['0:00:03 Niccollo @ Aviary', ': emits "(massive boom)"'].join('\n'), 'room-emits.md', 1, options, 0, 'hero');

      expect(atActivity.subjectKind).toBe('character');
      expect(emitsActivity.characterId).toBe('niccollo');
      expect(emitsActivity.subjectKind).toBe('character');
      expect(emitsActivity.subjectId).toBe('niccollo');
      expect(emitsActivity.activityText).toBe('emits "(massive boom)"');
    });

    it('parses waits activities with explicit and default durations', () => {
      const options = { isCrossMidnight:false, explicitEndTime:null };
      const [explicitWaitActivity, defaultWaitActivity] = parseItineraryActivities([
        '0:00:03 Stefan waits 3',
        ': Stefan waits'
      ].join('\n'), 'waits.md', 1, options, 0, 'hero');

      expect(explicitWaitActivity.activityText).toBe('waits 3');
      expect(explicitWaitActivity.waitDurationMsecs).toBe(3_000);
      expect(defaultWaitActivity.activityText).toBe('waits');
      expect(defaultWaitActivity.waitDurationMsecs).toBe(1_000);
    });

    it('rejects invalid waits durations', () => {
      const options = { isCrossMidnight:false, explicitEndTime:null };

      expect(() => parseItineraryActivities('0:00:03 Stefan waits later', 'waits-invalid.md', 1, options, 0, 'hero'))
        .toThrow("waits-invalid.md:1: invalid waits duration 'later'");
    });

    it('delays later relative activities by an explicit waits duration', () => {
      const level = loadLevelFromText(baseLevelText);
      const result = loadItineraries(level, [
        '0:00:00 Hero waits 3',
        ': Hero faces left'
      ].join('\n'), 'waits-resolution.md', 1);
      const hero = result.characters.find(character => character.id === 'hero');

      expect(hero).toBeTruthy();
      expect(findCharacterPose(hero!, 2_999).facingDirection).toBe('right');
      expect(findCharacterPose(hero!, 3_000).facingDirection).toBe('left');
    });

    it('defaults waits to one second for later relative activities', () => {
      const level = loadLevelFromText(baseLevelText);
      const result = loadItineraries(level, [
        '0:00:00 Hero waits',
        ': Hero faces left'
      ].join('\n'), 'waits-default-resolution.md', 1);
      const hero = result.characters.find(character => character.id === 'hero');

      expect(hero).toBeTruthy();
      expect(findCharacterPose(hero!, 999).facingDirection).toBe('right');
      expect(findCharacterPose(hero!, 1_000).facingDirection).toBe('left');
    });

    it('applies waits after its own relative timestamp resolves', () => {
      const level = loadLevelFromText(baseLevelText);
      const result = loadItineraries(level, [
        '0:00:00 Hero faces right',
        ': Hero waits 3',
        ': Hero faces left'
      ].join('\n'), 'waits-relative-resolution.md', 1);
      const hero = result.characters.find(character => character.id === 'hero');

      expect(hero).toBeTruthy();
      expect(findCharacterPose(hero!, 3_000).facingDirection).toBe('right');
      expect(findCharacterPose(hero!, 3_001).facingDirection).toBe('left');
    });

    it('does not delay a later activity with an absolute timestamp', () => {
      const level = loadLevelFromText(baseLevelText);
      const result = loadItineraries(level, [
        '0:00:00 Hero waits 3',
        '0:00:01 Hero faces left'
      ].join('\n'), 'waits-absolute-override.md', 1);
      const hero = result.characters.find(character => character.id === 'hero');

      expect(hero).toBeTruthy();
      expect(findCharacterPose(hero!, 999).facingDirection).toBe('right');
      expect(findCharacterPose(hero!, 1_000).facingDirection).toBe('left');
    });

    it('reuses preview movement scheduling for absolute room-arrival activities', () => {
      const level = loadLevelFromText(baseLevelText);
      const planMovementToRoomSpy = vi.spyOn(activityMovementUtil, 'planMovementToRoom');

      loadItineraries(level, '0:00:05 Hero @ 75%', 'preview-reuse.md', 1);

      expect(planMovementToRoomSpy).toHaveBeenCalledTimes(1);
      planMovementToRoomSpy.mockRestore();
    });

    it('reuses settled pose state for lookups at the current scheduling time', () => {
      const level = loadLevelFromText(baseLevelText);
      const room = level.rooms[0];
      const waypoint = room.waypoints[0];
      const character = level.characters.find(candidate => candidate.id === 'hero');

      expect(room).toBeTruthy();
      expect(waypoint).toBeTruthy();
      expect(character).toBeTruthy();

      character!.position = { ...waypoint.position, z:ROOM_MIDDLE_ROW_CENTER_Z };
      character!.waypoint = waypoint;
      const state = createCharacterActivityState(character!);
      const targetWaypoint = room.waypoints.find(candidate => candidate !== waypoint && candidate.position.x !== waypoint.position.x) || room.waypoints[1];
      const walkEvent = createWalkEvent(room, 0, waypoint.position.x, waypoint.position.y, targetWaypoint!.position.x, targetWaypoint!.position.y,
        { ...waypoint.position, z:ROOM_MIDDLE_ROW_CENTER_Z }, { ...targetWaypoint!.position, z:ROOM_MIDDLE_ROW_CENTER_Z });

      expect(walkEvent).toBeTruthy();
      appendEventsToCharacterState(level, character!, state, [walkEvent!, createFaceEvent(walkEvent!.duration, 'left'), createBodyOrientationEvent(walkEvent!.duration, 'kneeling')]);

      const pose = findStatePoseAtTime(character!, state, state.time);
      expect(pose.position).toEqual({ ...targetWaypoint!.position, z:ROOM_MIDDLE_ROW_CENTER_Z });
      expect(pose.facingDirection).toBe('left');
      expect(pose.bodyOrientation).toBe('kneeling');
    });
  });
});