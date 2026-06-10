// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { syncConclusionsWithUnlocks } from '../conclusionDiscoveryUtil';
import Conclusion, { createDefaultConclusion } from '../types/Conclusion';
import ClozePartType from '../types/ClozePartType';

function createConclusion(overrides:Partial<Conclusion> = {}):Conclusion {
  return {
    ...createDefaultConclusion(),
    parts:[{ type:ClozePartType.text, text:'Test' }],
    isLocked:true,
    ...overrides
  };
}

describe('conclusionDiscoveryUtil', () => {
  it('unlocks a conclusion when a completed conclusion lists it in unlockConclusionIds', () => {
    const prerequisite = createConclusion({ id:'first', isComplete:true, isLocked:false, unlockConclusionIds:['second'] });
    const lockedConclusion = createConclusion({ id:'second' });
    const { conclusions, didChange } = syncConclusionsWithUnlocks([prerequisite, lockedConclusion]);

    expect(didChange).toBe(true);
    expect(conclusions[1].isLocked).toBe(false);
  });

  it('does not duplicate unchanged conclusions', () => {
    const conclusion = createConclusion();
    const { conclusions, didChange } = syncConclusionsWithUnlocks([conclusion]);

    expect(didChange).toBe(false);
    expect(conclusions[0]).toBe(conclusion);
  });
});