import { describe, expect, it } from 'vitest';

import Effect from '../types/Effect';
import {
  appendCharacterMetaTimeEffect,
  removeExpiredCharacterMetaTimeEffects,
  removeExpiredMetaTimeEffects
} from '../metaTimeEffectUtil';

describe('metaTimeEffectUtil', () => {
  describe('appendCharacterMetaTimeEffect()', () => {
    it('creates a collection for a new character', () => {
      const effectsByCharacterId = new Map<string, Effect[]>();
      const effect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };

      appendCharacterMetaTimeEffect(effectsByCharacterId, 'character-a', effect);

      expect(effectsByCharacterId.get('character-a')).toEqual([effect]);
    });

    it('appends to an existing collection without replacing it', () => {
      const firstEffect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };
      const secondEffect:Effect = { kind:'play', startTime:150, endTime:250, handler:null };
      const effects = [firstEffect];
      const effectsByCharacterId = new Map([['character-a', effects]]);

      appendCharacterMetaTimeEffect(effectsByCharacterId, 'character-a', secondEffect);

      expect(effectsByCharacterId.get('character-a')).toBe(effects);
      expect(effects).toEqual([firstEffect, secondEffect]);
    });
  });

  describe('removeExpiredMetaTimeEffects()', () => {
    it('leaves an empty collection empty', () => {
      const effects:Effect[] = [];

      removeExpiredMetaTimeEffects(effects, 100);

      expect(effects).toEqual([]);
    });

    it('keeps an effect before its end time', () => {
      const effect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };
      const effects = [effect];

      removeExpiredMetaTimeEffects(effects, 199);

      expect(effects).toEqual([effect]);
      expect(effects[0]).toBe(effect);
    });

    it('removes an effect exactly at its end time', () => {
      const effects:Effect[] = [{ kind:'play', startTime:100, endTime:200, handler:null }];

      removeExpiredMetaTimeEffects(effects, 200);

      expect(effects).toEqual([]);
    });

    it('removes adjacent expired effects without skipping either effect', () => {
      const activeEffect:Effect = { kind:'play', startTime:200, endTime:300, handler:null };
      const effects:Effect[] = [
        { kind:'play', startTime:0, endTime:50, handler:null },
        { kind:'play', startTime:50, endTime:100, handler:null },
        activeEffect
      ];

      removeExpiredMetaTimeEffects(effects, 100);

      expect(effects).toEqual([activeEffect]);
    });

    it('preserves active and future effects in order with their original identities', () => {
      const firstEffect:Effect = { kind:'play', startTime:50, endTime:150, handler:null };
      const secondEffect:Effect = { kind:'play', startTime:200, endTime:300, handler:null };
      const effects:Effect[] = [
        firstEffect,
        { kind:'play', startTime:0, endTime:100, handler:null },
        secondEffect
      ];

      removeExpiredMetaTimeEffects(effects, 100);

      expect(effects).toEqual([firstEffect, secondEffect]);
      expect(effects[0]).toBe(firstEffect);
      expect(effects[1]).toBe(secondEffect);
    });
  });

  describe('removeExpiredCharacterMetaTimeEffects()', () => {
    it('retains active effects', () => {
      const effect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };
      const effects = [effect];
      const effectsByCharacterId = new Map([['character-a', effects]]);

      removeExpiredCharacterMetaTimeEffects(effectsByCharacterId, 199);

      expect(effectsByCharacterId.get('character-a')).toBe(effects);
      expect(effects).toEqual([effect]);
    });

    it('removes adjacent expired effects', () => {
      const activeEffect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };
      const effects:Effect[] = [
        { kind:'play', startTime:0, endTime:50, handler:null },
        { kind:'play', startTime:50, endTime:100, handler:null },
        activeEffect
      ];
      const effectsByCharacterId = new Map([['character-a', effects]]);

      removeExpiredCharacterMetaTimeEffects(effectsByCharacterId, 100);

      expect(effects).toEqual([activeEffect]);
    });

    it('preserves surviving effect identity and order', () => {
      const firstEffect:Effect = { kind:'play', startTime:50, endTime:150, handler:null };
      const secondEffect:Effect = { kind:'play', startTime:200, endTime:300, handler:null };
      const effects:Effect[] = [
        firstEffect,
        { kind:'play', startTime:0, endTime:100, handler:null },
        secondEffect
      ];
      const effectsByCharacterId = new Map([['character-a', effects]]);

      removeExpiredCharacterMetaTimeEffects(effectsByCharacterId, 100);

      expect(effectsByCharacterId.get('character-a')).toBe(effects);
      expect(effects).toEqual([firstEffect, secondEffect]);
      expect(effects[0]).toBe(firstEffect);
      expect(effects[1]).toBe(secondEffect);
    });

    it('deletes a character entry whose effects all expired', () => {
      const effectsByCharacterId = new Map<string, Effect[]>([
        ['character-a', [{ kind:'play', startTime:0, endTime:100, handler:null }]]
      ]);

      removeExpiredCharacterMetaTimeEffects(effectsByCharacterId, 100);

      expect(effectsByCharacterId.has('character-a')).toBe(false);
    });

    it('retains nonempty keys while deleting empty keys', () => {
      const activeEffect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };
      const effectsByCharacterId = new Map<string, Effect[]>([
        ['character-a', [{ kind:'play', startTime:0, endTime:100, handler:null }]],
        ['character-b', [activeEffect]]
      ]);

      removeExpiredCharacterMetaTimeEffects(effectsByCharacterId, 100);

      expect([...effectsByCharacterId.keys()]).toEqual(['character-b']);
      expect(effectsByCharacterId.get('character-b')).toEqual([activeEffect]);
    });
  });
});