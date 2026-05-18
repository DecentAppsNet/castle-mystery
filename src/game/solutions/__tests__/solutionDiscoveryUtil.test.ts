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
    unlockForItemId:null,
    unlockForSolutionId:null,
    ...overrides
  };
}

describe('solutionDiscoveryUtil', () => {
  it('unlocks a solution when its required item popover has been viewed', () => {
    const solution = createSolution({ unlockForItemId:'Book' });
    const { solutions, didChange } = syncSolutionsWithUnlocks([solution], new Set(['Book']));

    expect(didChange).toBe(true);
    expect(solutions[0].isLocked).toBe(false);
  });

  it('unlocks a solution when its required item matches a viewed title case-insensitively', () => {
    const solution = createSolution({ unlockForItemId:'book' });
    const { solutions, didChange } = syncSolutionsWithUnlocks([solution], new Set(['Book']));

    expect(didChange).toBe(true);
    expect(solutions[0].isLocked).toBe(false);
  });

  it('unlocks a solution when its prerequisite solution is complete', () => {
    const prerequisite = createSolution({ id:'First', isComplete:true, isLocked:false });
    const lockedSolution = createSolution({ id:'Second', unlockForSolutionId:'First' });
    const { solutions, didChange } = syncSolutionsWithUnlocks([prerequisite, lockedSolution], new Set());

    expect(didChange).toBe(true);
    expect(solutions[1].isLocked).toBe(false);
  });

  it('does not duplicate unchanged solutions', () => {
    const solution = createSolution({ unlockForItemId:'Book' });
    const { solutions, didChange } = syncSolutionsWithUnlocks([solution], new Set());

    expect(didChange).toBe(false);
    expect(solutions[0]).toBe(solution);
  });
});