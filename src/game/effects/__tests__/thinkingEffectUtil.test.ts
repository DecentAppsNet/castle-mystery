import { describe, expect, it } from 'vitest';

import { calcThinkingAngleOffsetRadians, createThinkingEffect, THINKING_ANGLE_RADIANS, THINKING_LOOK_DOWN_DURATION_MSECS, THINKING_LOOK_UP_DURATION_MSECS } from '../thinkingEffectUtil';
import { createDefaultCharacter } from '@/game/types/Character';

describe('thinkingEffectUtil', () => {
  describe('calcThinkingAngleOffsetRadians()', () => {
    it('eases down to the thinking angle while active and back to zero after the thought ends', () => {
      const character = {
        ...createDefaultCharacter(),
        id:'hero'
      };
      const effect = createThinkingEffect(character, 2_000, 2_600, 2_100);

      expect(calcThinkingAngleOffsetRadians(effect, 2_000)).toBe(0);
      expect(calcThinkingAngleOffsetRadians(effect, 2_000 + THINKING_LOOK_DOWN_DURATION_MSECS)).toBe(THINKING_ANGLE_RADIANS);
      expect(calcThinkingAngleOffsetRadians(effect, 2_400)).toBe(THINKING_ANGLE_RADIANS);
      expect(calcThinkingAngleOffsetRadians(effect, 2_600 + THINKING_LOOK_UP_DURATION_MSECS)).toBe(0);
    });

    it('returns from the current partial tilt when the thought ends before fully looking down', () => {
      const character = {
        ...createDefaultCharacter(),
        id:'hero'
      };
      const effect = createThinkingEffect(character, 1_000, 1_100, 1_050);

      expect(calcThinkingAngleOffsetRadians(effect, 1_100)).toBeCloseTo(THINKING_ANGLE_RADIANS * 0.5);
      expect(calcThinkingAngleOffsetRadians(effect, 1_100 + THINKING_LOOK_UP_DURATION_MSECS)).toBe(0);
    });
  });
});