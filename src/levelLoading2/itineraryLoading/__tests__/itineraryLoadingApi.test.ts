import { describe, it, expect } from 'vitest';

import { createEditableItinerary } from "../itineraryLoadingApi";
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultItem } from '@/game/types/Item';

describe('itineraryLoadingApi', () => {
  describe('createEditableItinerary()', () => {
    it('creates a minimal itinerary', () => {
      const itinerary = createEditableItinerary([], [], 1234);

      expect(itinerary.characterIdToI).toEqual({});
      expect(itinerary.roomIdToI).toEqual({});
      expect(itinerary.keyframes).toHaveLength(1);
      expect(itinerary.editableKeyframes).toHaveLength(1);
      expect(itinerary.keyframes[0]).toEqual({
        time:1234,
        characters:[],
        rooms:[]
      });
      expect(itinerary.editableKeyframes[0]).toBe(itinerary.keyframes[0]);
    });

    it('creates an itinerary with starting character positions', () => {
      const alpha = {
        ...createDefaultCharacter(),
        id:'alpha',
        position:{ x:1, y:2, z:3 }
      };
      const beta = {
        ...createDefaultCharacter(),
        id:'beta',
        position:{ x:10, y:20, z:30 }
      };

      const itinerary = createEditableItinerary([alpha, beta], [], 5000);

      expect(itinerary.characterIdToI).toEqual({ alpha:0, beta:1 });
      expect(itinerary.keyframes[0]?.characters.map(character => character.position)).toEqual([
        { x:1, y:2, z:3 },
        { x:10, y:20, z:30 }
      ]);
      expect(itinerary.keyframes[0]?.characters[0]?.position).not.toBe(alpha.position);
      expect(itinerary.keyframes[0]?.characters[1]?.position).not.toBe(beta.position);
    });

    it('creates an itinerary with starting room positions', () => {
      const crown = {
        ...createDefaultItem(),
        id:'crown',
        position:{ x:4, y:5, z:6 }
      };
      const hall = {
        ...createDefaultRoom(),
        id:'hall',
        items:[crown]
      };

      const itinerary = createEditableItinerary([], [hall], 5000);

      expect(itinerary.roomIdToI).toEqual({ hall:0 });
      expect(itinerary.keyframes[0]?.rooms[0]?.items).toHaveLength(1);
      expect(itinerary.keyframes[0]?.rooms[0]?.items[0]).toMatchObject({
        id:'crown',
        position:{ x:4, y:5, z:6 }
      });
      expect(itinerary.keyframes[0]?.rooms[0]?.items[0]).not.toBe(crown);
      expect(itinerary.keyframes[0]?.rooms[0]?.items[0]?.position).not.toBe(crown.position);
    });
  });
});