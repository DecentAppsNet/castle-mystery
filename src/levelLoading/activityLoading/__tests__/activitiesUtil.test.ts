// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { ErrorCollector } from '../../errorCollection';
import { loadLevelSections } from '../../levelFileSectionUtil';
import activityProvenanceLevelText from './fixtures/activity-provenance.md?raw';
import { loadActivitiesPartially } from '../activitiesUtil';
import { createActivityParsingRules } from '../parsingRulesUtil';

function _createErrorCollector(text:string):ErrorCollector {
  return new ErrorCollector(text, text.split('\n').map((_, lineI) => ({
    filename:'activity-provenance.md',
    lineNo:lineI + 1
  })));
}

describe('activitiesUtil', () => {
  describe('loadActivitiesPartially()', () => {
    it('preserves combined line indexes through sorting and authored relationships', () => {
      const errors = _createErrorCollector(activityProvenanceLevelText);
      const sections = loadLevelSections(activityProvenanceLevelText, errors);
      const rules = createActivityParsingRules(['sam'], ['hall'], [], []);
      const lines = activityProvenanceLevelText.split('\n');
      const firstActivityLineI = lines.findIndex(line => line === '0:00:20 Sam waits');
      const secondActivityLineI = lines.findIndex(line => line === '0:00:10 Sam waits');

      const activities = loadActivitiesPartially(sections?.itinerary, rules, 10_000, 'sam', errors);

      expect(errors.describeErrors()).toBe('');
      expect(activities?.map(activity => activity.lineI)).toEqual([secondActivityLineI, firstActivityLineI]);
      const firstAuthoredActivity = activities?.find(activity => activity.lineI === firstActivityLineI);
      const secondAuthoredActivity = activities?.find(activity => activity.lineI === secondActivityLineI);
      expect(firstAuthoredActivity?.nextActivity).toBe(secondAuthoredActivity);
      expect(secondAuthoredActivity?.prevActivity).toBe(firstAuthoredActivity);
    });
  });
});