// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { syncSolutionsWithUnlocks } from '../solutionDiscoveryUtil';
import Solution from '../types/Solution';
import ClozePartType from '../types/ClozePartType';

function createSolution(overrides:Partial<Solution> = {}):Solution {
  return {
    id:'test',
    title:'Test',
    parts:[{ type:ClozePartType.text, text:'Test' }],
    isComplete:false,
    isLocked:true,
    unlockSolutionIds:[],
    revealRoomIds:[],
    ...overrides
  };
}

describe('solutionDiscoveryUtil', () => {
  it('unlocks a solution when a completed solution lists it in unlockSolutionIds', () => {
    const prerequisite = createSolution({ id:'first', isComplete:true, isLocked:false, unlockSolutionIds:['second'] });
    const lockedSolution = createSolution({ id:'second' });
    const { solutions, didChange } = syncSolutionsWithUnlocks([prerequisite, lockedSolution]);

    expect(didChange).toBe(true);
    expect(solutions[1].isLocked).toBe(false);
  });

  it('does not duplicate unchanged solutions', () => {
    const solution = createSolution();
    const { solutions, didChange } = syncSolutionsWithUnlocks([solution]);

    expect(didChange).toBe(false);
    expect(solutions[0]).toBe(solution);
  });
});