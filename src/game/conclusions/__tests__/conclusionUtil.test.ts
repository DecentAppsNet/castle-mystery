// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';
import { createAnswerSet } from '../answerSetUtil';
import { countConclusionMistakes, isConclusionMissingAnswers } from '../conclusionUtil';
import Conclusion from '../types/Conclusion.ts';
import { UNSPECIFIED_ANSWER } from '../types/ClozeBlank';
import ClozePartType from '../types/ClozePartType';

function createConclusion(overrides:Partial<Conclusion> = {}):Conclusion {
  return {
    id:'test-conclusion',
    title:'Test Statement',
    parts:[],
    isComplete:false,
    isLocked:false,
    incorrectGuessCount:0,
    unlockConclusionIds:[],
    revealRoomIds:[],
    ...overrides
  };
}

describe('conclusionUtil', () => {
  describe('isConclusionMissingAnswers()', () => {
    it('returns false when all blank answers are within bounds', () => {
      const statement = createConclusion({
        id:'test-complete',
        parts:[
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['apple', 'orange'], 'fruits'),
            correctAnswerIndexes:[0],
            playerAnswerIndex: 1
          }
        ]
      });

      expect(isConclusionMissingAnswers(statement)).toBe(false);
    });

    it('returns true when a blank answer is unspecified', () => {
      const statement = createConclusion({
        id:'test-missing',
        parts:[
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['apple', 'orange'], 'fruits'),
            correctAnswerIndexes:[0],
            playerAnswerIndex:UNSPECIFIED_ANSWER
          }
        ]
      });

      expect(isConclusionMissingAnswers(statement)).toBe(true);
    });

    it('returns false for out-of-range values that are not the unspecified sentinel', () => {
      const statement = createConclusion({
        id:'test-out-of-range',
        parts:[
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['apple', 'orange'], 'fruits'),
            correctAnswerIndexes:[0],
            playerAnswerIndex: 99
          }
        ]
      });

      expect(isConclusionMissingAnswers(statement)).toBe(false);
    });
  });

  describe('countConclusionMistakes()', () => {
    it('returns 0 when there are no blank parts', () => {
      const statement = createConclusion({
        id:'test-1',
        parts:[
          {
            type:ClozePartType.text,
            text:'This is some text.'
          }
        ]
      });

      expect(countConclusionMistakes(statement)).toBe(0);
    });

    it('returns 0 when all blanks have correct answers', () => {
      const statement = createConclusion({
        id:'test-2',
        parts:[
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['apple', 'fruit'], 'foods'),
            correctAnswerIndexes:[0],
            playerAnswerIndex: 0
          },
          {
            type:ClozePartType.text,
            text:' is a '
          },
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['fruit', 'vegetable'], 'food types'),
            correctAnswerIndexes:[0],
            playerAnswerIndex: 0
          }
        ]
      });

      expect(countConclusionMistakes(statement)).toBe(0);
    });

    it('returns 1 when one blank has an incorrect answer', () => {
      const statement = createConclusion({
        id:'test-3',
        parts:[
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['apple', 'orange'], 'fruits'),
            correctAnswerIndexes:[0],
            playerAnswerIndex: 1
          }
        ]
      });

      expect(countConclusionMistakes(statement)).toBe(1);
    });

    it('counts multiple incorrect blanks', () => {
      const statement = createConclusion({
        id:'test-4',
        parts:[
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['apple', 'orange'], 'fruits'),
            correctAnswerIndexes:[0],
            playerAnswerIndex: 1
          },
          {
            type:ClozePartType.text,
            text:' is a '
          },
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['fruit', 'vegetable'], 'food types'),
            correctAnswerIndexes:[0],
            playerAnswerIndex: 1
          },
          {
            type:ClozePartType.text,
            text:'.'
          },
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['red', 'yellow'], 'colors'),
            correctAnswerIndexes:[0],
            playerAnswerIndex: 0
          }
        ]
      });

      expect(countConclusionMistakes(statement)).toBe(2);
    });

    it('recognizes multiple correct answers for a single blank', () => {
      const statement = createConclusion({
        id:'test-5',
        parts:[
          {
            type:ClozePartType.blank,
            answerSet:createAnswerSet(['cat', 'dog', 'kitten'], 'animals'),
            correctAnswerIndexes:[0, 2],
            playerAnswerIndex: 2
          }
        ]
      });

      expect(countConclusionMistakes(statement)).toBe(0);
    });

    it('handles empty parts array', () => {
      const statement = createConclusion({ id:'test-6', title:'Empty Statement', parts:[] });

      expect(countConclusionMistakes(statement)).toBe(0);
    });

    it('compares selected display text by trimmed lowercase rather than by index or set identity', () => {
      const statement = createConclusion({ parts:[
        { type:'blank', answerSet:createAnswerSet(['Jack', 'Jill'], 'characters'),
          correctAnswerIndexes:[0, 1], playerAnswerIndex:0 },
        { type:'blank', answerSet:createAnswerSet(['Jill', ' JACK '], 'names'),
          correctAnswerIndexes:[0, 1], playerAnswerIndex:1 }
      ] });
      expect(countConclusionMistakes(statement)).toBe(1);
    });

    it('counts each unspecified blank once without treating its sentinel as a selected answer', () => {
      const answerSet = createAnswerSet(['Jack', 'Jill'], 'characters');
      const statement = createConclusion({ parts:[
        { type:'blank', answerSet, correctAnswerIndexes:[0, 1], playerAnswerIndex:-1 },
        { type:'blank', answerSet, correctAnswerIndexes:[0, 1], playerAnswerIndex:-1 }
      ] });
      expect(countConclusionMistakes(statement)).toBe(2);
    });
  });
});

