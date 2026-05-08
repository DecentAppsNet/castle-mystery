import { describe, expect, it } from 'vitest';

import authoredItinerarySortingText from './authored-itinerary-sorting.md?raw';
import kingacideAuthoredItineraryText from './kingacide-authored-itinerary.md?raw';
import { loadLevelFromText } from '../levelUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';

describe('levelUtil authored itinerary loading', () => {
  it('sorts timestamped activities instead of using file order', () => {
    const level = loadLevelFromText(authoredItinerarySortingText);

    const hero = level.characters.find(character => character.id === 'Hero');
    expect(hero?.itinerary.map(event => event.startTime)).toEqual([1_000, 2_000]);
  });

  it('loads kingacide authored activities including title-based takes and facing events', () => {
    const level = loadLevelFromText(kingacideAuthoredItineraryText);
    const queen = level.characters.find(character => character.id === 'Queen');
    const king = level.characters.find(character => character.id === 'King');

    expect(queen?.items.map(item => item.id)).toContain('Romance Novel');
    expect(king?.itinerary.some(event => event.type === ItineraryEventType.FACING && event.startTime === 35_000)).toBe(true);
    expect(queen?.itinerary.some(event => event.type === ItineraryEventType.FACING && event.startTime === 35_000)).toBe(true);
  });
});