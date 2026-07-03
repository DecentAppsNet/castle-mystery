import { describe, expect, it } from 'vitest';

import { createDefaultCharacter } from '../types/Character';
import Itinerary from '../types/Itinerary';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import { findIncomingCharacterReplacementEvent, getKnownItinerary, hasPairedItinerary } from '../pairedItineraryUtil';

describe('paired itinerary util', () => {
  describe('hasPairedItinerary()', () => {
    it('returns false when paired itinerary is missing and true when present', () => {
      const character = createDefaultCharacter();
      const pairedItinerary:Itinerary = [];

      expect(hasPairedItinerary(character)).toBe(false);
      character.pairedItinerary = pairedItinerary;
      expect(hasPairedItinerary(character)).toBe(true);
    });
  });

  describe('getKnownItinerary()', () => {
    it('returns the own itinerary until pairing knowledge is known', () => {
      const character = createDefaultCharacter();
      const itinerary:Itinerary = [];
      const pairedItinerary:Itinerary = [];
      character.itinerary = itinerary;
      character.pairedItinerary = pairedItinerary;

      expect(getKnownItinerary(character)).toBe(itinerary);

      character.isPairingKnown = true;
      expect(getKnownItinerary(character)).toBe(pairedItinerary);
    });
  });

  describe('findIncomingCharacterReplacementEvent()', () => {
    it('finds the incoming replacement event from paired itinerary when the own itinerary does not contain it', () => {
      const sourceCharacter = { ...createDefaultCharacter(), id:'source' };
      const targetCharacter = { ...createDefaultCharacter(), id:'target' };
      const becomesEvent = {
        type:ItineraryEventType.BECOMES_CHARACTER,
        startTime:1_000,
        duration:0,
        sourceCharacterId:'source',
        targetCharacterId:'target'
      };

      sourceCharacter.itinerary = [becomesEvent];
      sourceCharacter.pairedItinerary = [becomesEvent];
      targetCharacter.itinerary = [];
      targetCharacter.pairedItinerary = [becomesEvent];

      expect(findIncomingCharacterReplacementEvent(sourceCharacter)).toBeNull();
      expect(findIncomingCharacterReplacementEvent(targetCharacter)).toBe(becomesEvent);
    });

    it('asserts when a character has a becomes event without paired itinerary being set', () => {
      const character = {
        ...createDefaultCharacter(),
        id:'source',
        itinerary:[{
        type:ItineraryEventType.BECOMES_CHARACTER,
        startTime:1_000,
        duration:0,
        sourceCharacterId:'source',
        targetCharacterId:'target'
      }]
      };

      expect(() => findIncomingCharacterReplacementEvent(character))
        .toThrow(/can't have a character becomes event without \.pairedItinerary being set/i);
    });
  });
});