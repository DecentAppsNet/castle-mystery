import { describe, expect, it } from 'vitest';

import { createDefaultCharacter } from '../types/Character';
import Itinerary from '../types/Itinerary';
import { getKnownItinerary, hasPairedItinerary } from '../pairedItineraryUtil';

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
});