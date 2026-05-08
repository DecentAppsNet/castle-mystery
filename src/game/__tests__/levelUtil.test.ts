import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import itinerarySortingText from './fixtures/itinerary-sorting.md?raw';
import kingacideItineraryText from './fixtures/kingacide-itinerary.md?raw';
import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '../levelUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';

describe('levelUtil itinerary loading', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('sorts timestamped activities instead of using file order', () => {
    const level = loadLevelFromText(itinerarySortingText);

    const hero = level.characters.find(character => character.id === 'Hero');
    expect(hero?.itinerary.map(event => event.startTime)).toEqual([1_000, 2_000]);
  });

  it('loads kingacide itinerary activities including title-based takes and facing events', () => {
    const level = loadLevelFromText(kingacideItineraryText);
    const queen = level.characters.find(character => character.id === 'Queen');
    const king = level.characters.find(character => character.id === 'King');

    expect(queen?.items.map(item => item.id)).toContain('Romance Novel');
    expect(king?.itinerary.some(event => event.type === ItineraryEventType.FACING && event.startTime === 35_000)).toBe(true);
    expect(queen?.itinerary.some(event => event.type === ItineraryEventType.FACING && event.startTime === 35_000)).toBe(true);
  });

  it('sets level duration from the longest character itinerary', () => {
    const level = loadLevelFromText(kingacideItineraryText);
    expect(level.duration).toEqual(41_000);
  });
});