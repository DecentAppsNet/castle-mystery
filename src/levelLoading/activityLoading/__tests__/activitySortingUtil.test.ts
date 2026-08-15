// Follow test conventions from CONTRIBUTING.md when editing this file.

import { describe, expect, it } from 'vitest';

import { sortActivities, sortActivitiesAfterStartTimeAssignment } from '../activitySortingUtil';
import Activity from '../types/Activity';

function _activity(verb:string, startTime:number|null, lineI:number = 0):Activity {
  return {
    lineI,
    verb,
    startTime,
    endTime:null,
    parts:{},
    prevActivity:null,
    nextActivity:null
  };
}

function _verbs(activities:readonly Activity[]):string[] {
  return activities.map(activity => activity.verb);
}

describe('activitySortingUtil', () => {
  describe('sortActivities()', () => {
    it('returns a new empty array for no activities', () => {
      const activities:Activity[] = [];

      const result = sortActivities(activities, 0);

      expect(result).toEqual([]);
      expect(result).not.toBe(activities);
    });

    it('sorts activities by ascending start time', () => {
      const activities = [
        _activity('late', 30),
        _activity('early', 10),
        _activity('middle', 20)
      ];

      expect(_verbs(sortActivities(activities, 0))).toEqual(['early', 'middle', 'late']);
    });

    it('keeps relative activities with their preceding absolute activity', () => {
      const activities = [
        _activity('late', 30),
        _activity('late-relative-one', null),
        _activity('late-relative-two', null),
        _activity('early', 10),
        _activity('early-relative', null)
      ];

      expect(_verbs(sortActivities(activities, 0))).toEqual([
        'early',
        'early-relative',
        'late',
        'late-relative-one',
        'late-relative-two'
      ]);
    });

    it('preserves authored order for activities with equal start times', () => {
      const activities = [
        _activity('first', 10),
        _activity('first-relative', null),
        _activity('second', 10)
      ];

      expect(_verbs(sortActivities(activities, 0))).toEqual(['first', 'first-relative', 'second']);
    });
  });

  describe('sortActivitiesAfterStartTimeAssignment()', () => {
    it('returns the original array when no reordering is needed', () => {
      const activities = [
        _activity('first', 10),
        _activity('updated', 20),
        _activity('later', 30)
      ];

      expect(sortActivitiesAfterStartTimeAssignment(activities, 1, 0)).toBe(activities);
    });

    it('moves later timestamped activities that precede the newly assigned time', () => {
      const activities = [
        _activity('first', 0),
        _activity('updated', 10),
        _activity('relative-after-updated', null),
        _activity('at-five', 5),
        _activity('relative-after-five', null),
        _activity('at-seven', 7),
        _activity('at-ten', 10),
        _activity('at-twelve', 12)
      ];

      const result = sortActivitiesAfterStartTimeAssignment(activities, 1, 0);

      expect(_verbs(result)).toEqual([
        'first',
        'at-five',
        'at-seven',
        'updated',
        'relative-after-updated',
        'relative-after-five',
        'at-ten',
        'at-twelve'
      ]);
      expect(result).not.toBe(activities);
    });
  });
});
