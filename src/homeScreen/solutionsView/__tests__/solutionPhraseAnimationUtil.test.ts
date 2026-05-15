import { describe, expect, it } from 'vitest';

import Solution from '@/game/solutions/types/Solution';
import ClozePartType from '@/game/solutions/types/ClozePartType';
import { createSolutionPhraseAnimationQueueItems, SOLUTION_PHRASE_ANIMATION_COUNTDOWN_MSECS, SOLUTION_PHRASE_ANIMATION_REVEAL_MSECS } from '../solutionPhraseAnimationUtil';

function _createSolution(id:string, lockedRemainingPhrases:string[], isLocked:boolean = lockedRemainingPhrases.length > 0):Solution {
  return {
    id,
    title:id,
    parts:[{ type:ClozePartType.text, text:id }],
    isComplete:false,
    isLocked,
    lockedRemainingPhrases
  };
}

describe('solutionPhraseAnimationUtil', () => {
  describe('createSolutionPhraseAnimationQueueItems()', () => {
    it('creates one queued animation per unique discovered phrase', () => {
      const previousSolutions = [
        _createSolution('One', ['king', 'throne room']),
        _createSolution('Two', ['throne room', 'book'])
      ];
      const nextSolutions = [
        _createSolution('One', [] , false),
        _createSolution('Two', ['book'])
      ];

      expect(createSolutionPhraseAnimationQueueItems(previousSolutions, nextSolutions)).toEqual([
        {
          id:'0:king',
          phrase:'king',
          unlockedSolutionIds:[],
          durationMsecs:SOLUTION_PHRASE_ANIMATION_COUNTDOWN_MSECS
        },
        {
          id:'1:throne room',
          phrase:'throne room',
          unlockedSolutionIds:['One'],
          durationMsecs:SOLUTION_PHRASE_ANIMATION_COUNTDOWN_MSECS + SOLUTION_PHRASE_ANIMATION_REVEAL_MSECS
        }
      ]);
    });

    it('returns an empty queue when no phrases were discovered', () => {
      const previousSolutions = [_createSolution('One', ['book'])];
      const nextSolutions = [_createSolution('One', ['book'])];

      expect(createSolutionPhraseAnimationQueueItems(previousSolutions, nextSolutions)).toEqual([]);
    });
  });
});