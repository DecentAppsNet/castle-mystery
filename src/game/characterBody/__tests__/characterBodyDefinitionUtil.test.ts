import { describe, expect, it } from 'vitest';

import { createDefaultCharacterBody, replaceHeadImage } from '../index';
import { createDefaultCharacter, duplicateCharacter } from '@/game/types/Character';

describe('characterBodyDefinitionUtil', () => {
  describe('replaceHeadImage()', () => {
    it('replaces only the head path and shares unaffected branches', () => {
      const root = createDefaultCharacterBody();
      const replaced = replaceHeadImage(root, '/assets/bodies/head.png');
      expect(replaced.connectedParts[0].part.imageUrl).toBe('/assets/bodies/head.png');
      expect(root.connectedParts[0].part.imageUrl).toBeNull();
      expect(replaced.connectedParts[1]).toBe(root.connectedParts[1]);
      expect(replaced.connectedParts[0].part.pivotPoint).toBe(root.connectedParts[0].part.pivotPoint);
    });

    it('does not modify the character body definition passed to it', () => {
      const character = createDefaultCharacter();
      const root = character.rootBodyPart;
      const before = structuredClone(root);

      const replaced = replaceHeadImage(root, '/assets/bodies/head.png');

      expect(replaced.connectedParts[0].part.imageUrl).toBe('/assets/bodies/head.png');
      expect(character.rootBodyPart).toBe(root);
      expect(root).toEqual(before);
    });

    it('reuses the original tree when the image is unchanged', () => {
      const root = createDefaultCharacterBody();
      expect(replaceHeadImage(root, null)).toBe(root);
    });
  });

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