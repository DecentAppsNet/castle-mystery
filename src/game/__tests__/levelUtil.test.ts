import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import itinerarySortingText from './fixtures/itinerary-sorting.md?raw';
import kingacideItineraryText from './fixtures/kingacide-itinerary.md?raw';
import sameTimeFaceOrderIndependenceText from './fixtures/same-time-face-order-independence.md?raw';
import sameTimeItemStateUsesCharacterOrderText from './fixtures/same-time-item-state-uses-character-order.md?raw';
import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '../levelUtil';
import { findCharacterPose } from '../itineraryUtil';
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

  it('resolves face targets independently of same-timestamp itinerary order', () => {
    const level = loadLevelFromText(sameTimeFaceOrderIndependenceText);
    const king = level.characters.find(character => character.id === 'King');
    const queen = level.characters.find(character => character.id === 'Queen');
    const kingFaceEvent = king?.itinerary.find(event => event.type === ItineraryEventType.FACING && event.startTime === 2_000);
    const kingPose = king ? findCharacterPose(king, 2_000) : null;
    const queenPose = queen ? findCharacterPose(queen, 2_000) : null;

    expect(kingFaceEvent?.type).toEqual(ItineraryEventType.FACING);
    expect(kingPose).not.toBeNull();
    expect(queenPose).not.toBeNull();
    expect((kingFaceEvent as { facingAngle:number } | undefined)?.facingAngle)
      .toBeCloseTo(Math.atan2((queenPose?.position.y || 0) - (kingPose?.position.y || 0), (queenPose?.position.x || 0) - (kingPose?.position.x || 0)));
  });

  it('sets level duration from the longest character itinerary', () => {
    const level = loadLevelFromText(kingacideItineraryText);
    expect(level.duration).toEqual(41_000);
  });

  it('uses deterministic character order for same-timestamp mutable state', () => {
    const level = loadLevelFromText(sameTimeItemStateUsesCharacterOrderText);
    const king = level.characters.find(character => character.id === 'King');

    expect(king?.itinerary.some(event => event.type === ItineraryEventType.FACING && event.startTime === 5_000)).toBe(true);
  });

});