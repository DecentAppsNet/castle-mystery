import { describe, expect, it } from 'vitest';

import { createDefaultCharacterBody } from '../index';
import { createDefaultCharacter, duplicateCharacter } from '@/game/types/Character';

describe('characterBodyDefinitionUtil', () => {
  describe('createDefaultCharacterBody()', () => {
    it('creates a headless default with null images on every body part', () => {
      const root = createDefaultCharacterBody();
      const parts = [root, ...root.connectedParts.map(({ part }) => part)];
      for (const part of parts) {
        expect(part.imageUrl).toBeNull();
      }
    });
  });

  describe('character defaulting and duplication', () => {
    it('preserves a character-specific root reference during duplication', () => {
      const rootBodyPart = { ...createDefaultCharacterBody(), width:2 };
      const character = { ...createDefaultCharacter(), rootBodyPart };
      expect(duplicateCharacter(character).rootBodyPart).toBe(rootBodyPart);
    });
  });
});