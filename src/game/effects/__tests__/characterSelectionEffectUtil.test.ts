import { describe, expect, it } from 'vitest';

import { createCharacterSelectionEffect } from '../characterSelectionEffectUtil';

describe('characterSelectionEffectUtil', () => {
  describe('createCharacterSelectionEffect()', () => {
    it('creates a character-selection effect with an 850 ms meta-time lifetime and handler', () => {
      const effect = createCharacterSelectionEffect(1000);

      expect(effect.kind).toBe('characterSelection');
      expect(effect.startTime).toBe(1000);
      expect(effect.endTime).toBe(1850);
      expect(effect.handler).toEqual(expect.any(Function));
    });

    it('creates independent effect objects on repeated calls', () => {
      const firstEffect = createCharacterSelectionEffect(1000);
      const secondEffect = createCharacterSelectionEffect(1000);

      expect(firstEffect).not.toBe(secondEffect);
    });
  });
});
