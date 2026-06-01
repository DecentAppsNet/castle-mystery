// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { syncSolutionsWithUnlocks } from '../solutionDiscoveryUtil';
import Solution from '../types/Solution';
import ClozePartType from '../types/ClozePartType';

function createSolution(overrides:Partial<Solution> = {}):Solution {
  return {
    id:'Test',
    title:'Test',
    parts:[{ type:ClozePartType.text, text:'Test' }],
    isComplete:false,
    isLocked:true,
    unlockForSolutionId:null,
    revealRoomIds:[],
    ...overrides
  };
}

describe('solutionDiscoveryUtil', () => {
  it('unlocks a solution when its prerequisite solution is complete', () => {
    const prerequisite = createSolution({ id:'First', isComplete:true, isLocked:false });
    const lockedSolution = createSolution({ id:'Second', unlockForSolutionId:'First' });
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