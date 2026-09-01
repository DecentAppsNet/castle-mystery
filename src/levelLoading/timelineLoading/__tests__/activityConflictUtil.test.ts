// Follow test conventions from CONTRIBUTING.md when editing this file.

import { describe, expect, it } from 'vitest';

import Activity from '../../activityLoading/types/Activity';
import {
  findConflictingCharacterActivity,
  findLatestBusyCharacterActivityEndTime
} from '../activityConflictUtil';

function _activity(verb:string, startTime:number|null, endTime:number|null,
    busyCharacterIds:readonly string[]|null):Activity {
  return {
    lineI:0,
    verb,
    startTime,
    endTime,
    busyCharacterIds,
    parts:{},
    nextActivity:null
  };
}

describe('activityConflictUtil', () => {
  describe('findLatestBusyCharacterActivityEndTime()', () => {
    it('returns the latest end among activities that make the character busy', () => {
      const activities = [
        _activity('waits', 100, 300, ['sam']),
        _activity('says', 200, 400, ['jo']),
        _activity('takes', 400, 500, ['sam'])
      ];

      expect(findLatestBusyCharacterActivityEndTime('sam', activities)).toBe(500);
    });

    it('returns null when no completed activity makes the character busy', () => {
      const activities = [
        _activity('waits', 100, null, ['sam']),
        _activity('says', 200, 400, ['jo'])
      ];

      expect(findLatestBusyCharacterActivityEndTime('sam', activities)).toBeNull();
    });
  });

  describe('findConflictingCharacterActivity()', () => {
    it('returns an overlapping activity sharing a busy character', () => {
      const prior = _activity('waits', 100, 300, ['sam']);
      const current = _activity('says', 200, 400, ['sam']);

      expect(findConflictingCharacterActivity(current, [prior])).toEqual({
        characterId:'sam',
        activity:prior
      });
    });

    it('allows activities meeting at an exact end and start boundary', () => {
      const prior = _activity('waits', 100, 200, ['sam']);
      const current = _activity('says', 200, 300, ['sam']);

      expect(findConflictingCharacterActivity(current, [prior])).toBeNull();
    });

    it('allows a zero-duration current activity inside a longer activity', () => {
      const prior = _activity('waits', 100, 300, ['sam']);
      const current = _activity('faces', 200, 200, ['sam']);

      expect(findConflictingCharacterActivity(current, [prior])).toBeNull();
    });

    it('allows a prior zero-duration activity inside a longer activity', () => {
      const prior = _activity('faces', 200, 200, ['sam']);
      const current = _activity('waits', 100, 300, ['sam']);

      expect(findConflictingCharacterActivity(current, [prior])).toBeNull();
    });

    it('allows overlapping activities with disjoint busy characters', () => {
      const prior = _activity('waits', 100, 300, ['jo']);
      const current = _activity('says', 200, 400, ['sam']);

      expect(findConflictingCharacterActivity(current, [prior])).toBeNull();
    });

    it('allows overlapping activities with no busy characters', () => {
      const prior = _activity('becomes', 100, 300, []);
      const current = _activity('emits', 200, 400, []);

      expect(findConflictingCharacterActivity(current, [prior])).toBeNull();
    });

    it('returns the first conflict in scheduling order', () => {
      const first = _activity('waits', 100, 300, ['sam']);
      const second = _activity('says', 150, 350, ['sam']);
      const current = _activity('takes', 200, 400, ['sam']);

      expect(findConflictingCharacterActivity(current, [first, second])?.activity).toBe(first);
    });

    it('ignores candidates with incomplete timing', () => {
      const incomplete = _activity('waits', 100, null, ['sam']);
      const current = _activity('says', 200, 400, ['sam']);

      expect(findConflictingCharacterActivity(current, [incomplete])).toBeNull();
    });

    it('treats incomplete current participation as an internal invariant violation', () => {
      const current = _activity('says', 200, 400, null);

      expect(() => findConflictingCharacterActivity(current, [])).toThrow();
    });
  });
});
