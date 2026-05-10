import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import itinerarySortingText from './fixtures/itinerary-sorting.md?raw';
import invalidItineraryActivityText from './fixtures/invalid-itinerary-activity.md?raw';
import kingacideItineraryText from './fixtures/kingacide-itinerary.md?raw';
import sameTimeFaceOrderIndependenceText from './fixtures/same-time-face-order-independence.md?raw';
import sameTimeItemStateUsesCharacterOrderText from './fixtures/same-time-item-state-uses-character-order.md?raw';
import { clearSeed, setSeed } from '@/common/randUtil';
import LoadLevelException from '../LoadLevelException';
import { loadLevelFromText } from '../levelUtil';
import { findCharacterPose } from '../itineraryUtil';
import { findRoom } from '../roomUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import atRoomMarkerText from '../integration-tests/fixtures/at-room-marker.md?raw';

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

  it('loads room position markers from room legends and grids', () => {
    const level = loadLevelFromText(atRoomMarkerText);
    const library = findRoom(level.rooms, 'Library');

    expect(library.positionMarkersById.SW).toEqual({ x:32, y:28 });
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

  it('wraps itinerary line errors with filename and line number', () => {
    try {
      loadLevelFromText(invalidItineraryActivityText, 'invalid-itinerary-activity.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).levelFilename).toBe('invalid-itinerary-activity.md');
      expect((error as LoadLevelException).errorLineNo).toBe(42);
      expect((error as LoadLevelException).message).toContain('invalid-itinerary-activity.md:42');
      expect((error as LoadLevelException).message).toMatch(/parse itinerary activity line/i);
    }
  });

  it('wraps unknown room marker references with filename and line number', () => {
    const invalidMarkerText = atRoomMarkerText.replace('@ Library.SW', '@ Library.NOPE');

    try {
      loadLevelFromText(invalidMarkerText, 'at-room-marker.md');
      expect.fail('expected level loading to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LoadLevelException);
      expect((error as LoadLevelException).message).toContain('at-room-marker.md:52');
      expect((error as LoadLevelException).message).toContain('unknown position marker Library.NOPE');
    }
  });

});