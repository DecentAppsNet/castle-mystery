import { describe, expect, it } from 'vitest';

import { createDefaultCharacter } from '../types/Character';
import Itinerary from '../types/Itinerary';
import { getKnownItinerary, getPairedItineraryIfAvailable, hasPairedItinerary } from '../pairedItineraryUtil';

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

  describe('getPairedItineraryIfAvailable()', () => {
    it('returns the paired itinerary when present and null otherwise', () => {
      const character = createDefaultCharacter();
      const pairedItinerary:Itinerary = [];

      expect(getPairedItineraryIfAvailable(character)).toBeNull();
      character.pairedItinerary = pairedItinerary;
      expect(getPairedItineraryIfAvailable(character)).toBe(pairedItinerary);
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