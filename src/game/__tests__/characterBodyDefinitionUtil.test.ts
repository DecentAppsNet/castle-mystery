import { describe, expect, it } from 'vitest';

import { createDefaultCharacterBody } from '../characterBodyDefinitionUtil';
import { createDefaultCharacter, duplicateCharacter } from '../types/Character';

describe('characterBodyDefinitionUtil', () => {
  describe('character defaulting and duplication', () => {
    it('shares the default tree between characters', () => {
      expect(createDefaultCharacter().rootBodyPart).toBe(createDefaultCharacterBody());
      expect(createDefaultCharacter().rootBodyPart).toBe(createDefaultCharacter().rootBodyPart);
    });

    it('preserves a character-specific root reference during duplication', () => {
      const rootBodyPart = { ...createDefaultCharacterBody(), width:2 };
      const character = { ...createDefaultCharacter(), rootBodyPart };
      expect(duplicateCharacter(character).rootBodyPart).toBe(rootBodyPart);
    });
  });
});