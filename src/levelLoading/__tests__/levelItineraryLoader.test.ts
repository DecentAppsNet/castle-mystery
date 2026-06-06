// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import baseLevelText from '@/game/__tests__/fixtures/timeline-start-time-field.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
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
  });
});