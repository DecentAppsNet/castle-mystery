import { describe, expect, it } from 'vitest';

import { findCharactersForAuthoredOptions } from '../identitiesConclusionUtil';
import { createDefaultCharacter } from '@/game/types/Character';
import { ErrorCollector } from '@/levelLoading/errorCollection';

describe('identitiesConclusionUtil', () => {
  describe('findCharactersForAuthoredOptions()', () => {
    it('prefers an exact ID over an earlier character with a matching title', () => {
      const titleMatch = { ...createDefaultCharacter(), id:'other', title:'Ahmad' };
      const idMatch = { ...createDefaultCharacter(), id:'ahmad', title:'Ahmad ibn Faraj al-Balarmi' };
      const errors = new ErrorCollector('', []);

      const characters = findCharactersForAuthoredOptions(['ahmad'], [titleMatch, idMatch], errors);

      expect(characters).toHaveLength(1);
      expect(characters[0]).toBe(idMatch);
      expect(errors.count).toBe(0);
    });
  });
});