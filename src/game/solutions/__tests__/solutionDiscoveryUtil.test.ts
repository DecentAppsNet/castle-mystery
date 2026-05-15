import { describe, expect, it } from 'vitest';

import { findNormalizedSolutionPhrasesInText, normalizeSolutionPhrase, syncSolutionsWithDiscoveredPhrases } from '../solutionDiscoveryUtil';
import Solution from '../types/Solution';
import ClozePartType from '../types/ClozePartType';

function createSolution(overrides:Partial<Solution> = {}):Solution {
  return {
    id:'Test',
    title:'Test',
    parts:[{ type:ClozePartType.text, text:'Test' }],
    isComplete:false,
    isObscured:true,
    obscuredRemainingPhrases:['ted', 'throne room'],
    ...overrides
  };
}

describe('solutionDiscoveryUtil', () => {
  it('normalizes phrases to lowercased word sequences', () => {
    expect(normalizeSolutionPhrase(`  Throne   Room! `)).toBe('throne room');
  });

  it('finds candidate phrases in normalized text', () => {
    expect(findNormalizedSolutionPhrasesInText(`Ted! It's the Throne Room.`, ['ted', 'throne room', 'room', 'library'])).toEqual(['ted', 'throne room', 'room']);
  });

  it('reveals a solution once all required phrases are discovered', () => {
    const solution = createSolution();
    const { solutions, didChange } = syncSolutionsWithDiscoveredPhrases([solution], new Set(['ted', 'throne room']));

    expect(didChange).toBe(true);
    expect(solutions[0].obscuredRemainingPhrases).toEqual([]);
    expect(solutions[0].isObscured).toBe(false);
  });

  it('does not duplicate unchanged solutions', () => {
    const solution = createSolution({ obscuredRemainingPhrases:['throne room'] });
    const { solutions, didChange } = syncSolutionsWithDiscoveredPhrases([solution], new Set(['ted']));

    expect(didChange).toBe(false);
    expect(solutions[0]).toBe(solution);
  });
});