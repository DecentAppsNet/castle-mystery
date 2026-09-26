// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultCharacterKeyframe } from '@/game/types/CharacterKeyframe';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultRoomKeyframe } from '@/game/types/RoomKeyframe';
import { createDefaultTimeline } from '@/game/types/Timeline';
import { createItineraryMarkerModel } from '../itineraryMarkerUtil';

describe('itineraryMarkerUtil', () => {
  describe('createItineraryMarkerModel()', () => {
    it('excludes non-interactive characters from encounter times', () => {
      const activeCharacter = { ...createDefaultCharacter(), id:'active', description:'Active', skinId:'active-skin' };
      const interactiveCharacter = { ...createDefaultCharacter(), id:'interactive', description:'Interactive' };
      const nonInteractiveCharacter = { ...createDefaultCharacter(), id:'non-interactive', description:'' };
      const baseCharacters = [nonInteractiveCharacter, activeCharacter, interactiveCharacter];
      const characterIds = ['active', 'interactive', 'non-interactive'];
      const characterIdToI = { active:0, interactive:1, 'non-interactive':2 };
      const position = { x:5, y:5, z:0 };
      const characters = characterIds.map((id, characterI) => ({
        ...createDefaultCharacterKeyframe(), position, skinId:characterI === 0 ? 'active-skin' : id
      }));
      const timeline = { ...createDefaultTimeline(), characterIds, characterIdToI,
        keyframes:[{ time:0, characters, rooms:[createDefaultRoomKeyframe()] }] };
      const rooms = [{ ...createDefaultRoom(), id:'room', rect:{ x:0, y:0, width:10, height:10 } }];

      const markers = createItineraryMarkerModel(timeline, baseCharacters, 'active', 'active-skin', rooms,
        { 'active-skin':new Set(['active-skin']) }, new Set());

      expect(markers.encounterTimes).toEqual([0]);
    });
  });
});