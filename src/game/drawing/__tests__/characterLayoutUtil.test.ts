// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createCharacterLayout } from '../characters/characterLayoutUtil';

describe('characterLayoutUtil', () => {
  describe('createCharacterLayout()', () => {
    it('draws kneeling legs behind the spine instead of in front', () => {
      const backboneX = 50;
      const sittingLayout = createCharacterLayout(backboneX, 50, 20, 40, 'right', 'sitting');
      const kneelingLayout = createCharacterLayout(backboneX, 50, 20, 40, 'right', 'kneeling');
      const sittingLegSegments = sittingLayout.segments.slice(-2);
      const kneelingLegSegments = kneelingLayout.segments.slice(-2);

      expect(sittingLegSegments.every(segment => segment.toX > backboneX)).toBe(true);
      expect(kneelingLegSegments.every(segment => segment.toX < backboneX)).toBe(true);
    });
  });
});
