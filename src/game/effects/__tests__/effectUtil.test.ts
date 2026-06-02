import { describe, expect, it } from 'vitest';

import { ZERO_SCALING_FACTORS } from '@/game/drawing/drawUtil';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultRoom } from '@/game/types/Room';
import { processAfterCharacterEffects, processBeforeCharacterEffects } from '../effectUtil';
import { createDropItemEffect } from '../dropItemUtil';
import { createTakeItemEffect } from '../takeItemUtil';
import EffectType from '../types/EffectType';
import type Effect from '../types/Effect';

function _createItem(id:string, z:number) {
  return {
    id,
    title:id,
    displayChar:id.charAt(0).toUpperCase(),
    randomSalt:0,
    position:{ x:1, y:2, z },
    description:'',
    isDiscovered:true
  };
}

describe('effectUtil', () => {
  describe('processBeforeCharacterEffects()/processAfterCharacterEffects()', () => {
    it('runs character effects only in their matching draw phase', () => {
      const character = createDefaultCharacter();
      const calls:string[] = [];
      const effects = [
        {
          type:EffectType.TAKE_ITEM,
          character,
          drawsBefore:true,
          startTime:0,
          onProcessCharacterEffect:() => {
            calls.push('before');
            return true;
          }
        },
        {
          type:EffectType.DROP_ITEM,
          character,
          drawsBefore:false,
          startTime:0,
          onProcessCharacterEffect:() => {
            calls.push('after');
            return true;
          }
        }
      ] as Effect[];

      processBeforeCharacterEffects(character, effects, {} as CanvasRenderingContext2D, ZERO_SCALING_FACTORS);
      processAfterCharacterEffects(character, effects, {} as CanvasRenderingContext2D, ZERO_SCALING_FACTORS);

      expect(calls).toEqual(['before', 'after']);
    });
  });

  describe('take/drop character effect ordering', () => {
    it('draws before the character when the item z is not greater than the character depth', () => {
      const character = createDefaultCharacter();
      const room = createDefaultRoom();
      const item = _createItem('book', 0.4);

      const takeEffect = createTakeItemEffect(item, character, room, 0, 0.4);
      const dropEffect = createDropItemEffect(item, character, room, 0, 0.4);

      expect(takeEffect.drawsBefore).toBe(true);
      expect(dropEffect.drawsBefore).toBe(true);
    });

    it('draws after the character when the item z is greater than the character depth', () => {
      const character = createDefaultCharacter();
      const room = createDefaultRoom();
      const item = _createItem('box', 0.8);

      const takeEffect = createTakeItemEffect(item, character, room, 0, 0.4);
      const dropEffect = createDropItemEffect(item, character, room, 0, 0.4);

      expect(takeEffect.drawsBefore).toBe(false);
      expect(dropEffect.drawsBefore).toBe(false);
    });
  });
});