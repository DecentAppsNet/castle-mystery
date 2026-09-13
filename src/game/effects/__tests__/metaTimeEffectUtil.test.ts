import { describe, expect, it } from 'vitest';

import Effect from '../types/Effect';
import { removeExpiredMetaTimeEffects } from '../metaTimeEffectUtil';

function _createEffect(startTime:number, endTime:number):Effect {
  return { kind:'play', startTime, endTime, handler:null };
}

describe('metaTimeEffectUtil', () => {
  describe('removeExpiredMetaTimeEffects()', () => {
    it('leaves an empty collection empty', () => {
      const effects:Effect[] = [];

      removeExpiredMetaTimeEffects(effects, 100);

      expect(effects).toEqual([]);
    });

    it('keeps an effect before its end time', () => {
      const effect = _createEffect(100, 200);
      const effects = [effect];

      removeExpiredMetaTimeEffects(effects, 199);

      expect(effects).toEqual([effect]);
      expect(effects[0]).toBe(effect);
    });

    it('removes an effect exactly at its end time', () => {
      const effects = [_createEffect(100, 200)];

      removeExpiredMetaTimeEffects(effects, 200);

      expect(effects).toEqual([]);
    });

    it('removes adjacent expired effects without skipping either effect', () => {
      const activeEffect = _createEffect(200, 300);
      const effects = [_createEffect(0, 50), _createEffect(50, 100), activeEffect];

      removeExpiredMetaTimeEffects(effects, 100);

      expect(effects).toEqual([activeEffect]);
    });

    it('preserves active and future effects in order with their original identities', () => {
      const firstEffect = _createEffect(50, 150);
      const secondEffect = _createEffect(200, 300);
      const effects = [firstEffect, _createEffect(0, 100), secondEffect];

      removeExpiredMetaTimeEffects(effects, 100);

      expect(effects).toEqual([firstEffect, secondEffect]);
      expect(effects[0]).toBe(firstEffect);
      expect(effects[1]).toBe(secondEffect);
    });
  });
});