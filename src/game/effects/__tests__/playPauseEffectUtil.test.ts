import { describe, expect, it } from 'vitest';

import { createPauseEffect, createPlayEffect } from '../playPauseEffectUtil';

describe('playPauseEffectUtil', () => {
  describe('createPlayEffect()', () => {
    it('creates a play effect with a 260 ms meta-time lifetime and handler', () => {
      const effect = createPlayEffect(1000);

      expect(effect.kind).toBe('play');
      expect(effect.startTime).toBe(1000);
      expect(effect.endTime).toBe(1260);
      expect(effect.handler).toEqual(expect.any(Function));
    });

    it('creates independent effect objects on repeated calls', () => {
      const firstEffect = createPlayEffect(1000);
      const secondEffect = createPlayEffect(1000);

      expect(firstEffect).not.toBe(secondEffect);
    });
  });

  describe('createPauseEffect()', () => {
    it('creates a pause effect with a 260 ms meta-time lifetime and handler', () => {
      const effect = createPauseEffect(2000);

      expect(effect.kind).toBe('pause');
      expect(effect.startTime).toBe(2000);
      expect(effect.endTime).toBe(2260);
      expect(effect.handler).toEqual(expect.any(Function));
    });
  });
});