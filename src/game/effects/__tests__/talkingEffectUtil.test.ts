import { describe, expect, it } from 'vitest';

import { createTalkingEffect, calcTalkingAngleOffsetRadians } from '../talkingEffectUtil';
import { createDefaultCharacter } from '@/game/types/Character';

describe('talkingEffectUtil', () => {
  describe('createTalkingEffect()', () => {
    it('creates a deterministic dip schedule for the same speech timing', () => {
      const character = {
        ...createDefaultCharacter(),
        id:'hero',
        randomSalt:7
      };

      const effect1 = createTalkingEffect(character, 1_000, 1_800, 1_200);
      const effect2 = createTalkingEffect(character, 1_000, 1_800, 1_250);

      expect(effect1.dips).toEqual(effect2.dips);
    });
  });

  describe('calcTalkingAngleOffsetRadians()', () => {
    it('returns the peak angle at dip start and then eases back to zero', () => {
      const character = {
        ...createDefaultCharacter(),
        id:'hero',
        randomSalt:3
      };
      const effect = createTalkingEffect(character, 2_000, 2_800, 2_100);
      const firstDip = effect.dips[0];
      if (!firstDip) expect.fail('expected a first talking dip');

      expect(calcTalkingAngleOffsetRadians(effect, 2_000 + firstDip.startTimeOffset)).toBe(firstDip.peakAngleOffsetRadians);
      expect(calcTalkingAngleOffsetRadians(effect, 2_000 + firstDip.startTimeOffset + firstDip.returnDurationMsecs)).toBe(0);
      expect(calcTalkingAngleOffsetRadians(effect, 2_900)).toBe(0);
    });
  });
});
