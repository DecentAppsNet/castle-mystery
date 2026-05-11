import { describe, expect, it } from 'vitest';
import { countSolutionMistakes } from '../solutionUtil';
import Solution from '../types/Solution.ts';
import ClozePartType from '../types/ClozePartType';

describe('solutionUtil', () => {
  describe('countSolutionMistakes()', () => {
    it('returns 0 when there are no blank parts', () => {
      const statement: Solution = {
        id: 'test-1',
        title: 'Test Statement',
        parts: [
          {
            type: ClozePartType.text,
            text: 'This is some text.'
          }
        ]
      };

      expect(countSolutionMistakes(statement)).toBe(0);
    });

    it('returns 0 when all blanks have correct answers', () => {
      const statement: Solution = {
        id: 'test-2',
        title: 'Test Statement',
        parts: [
          {
            type: ClozePartType.blank,
            availableAnswers: ['apple', 'fruit'],
            correctAnswerIndexes: [0],
            playerAnswerIndex: 0
          },
          {
            type: ClozePartType.text,
            text: ' is a '
          },
          {
            type: ClozePartType.blank,
            availableAnswers: ['fruit', 'vegetable'],
            correctAnswerIndexes: [0],
            playerAnswerIndex: 0
          }
        ]
      };

      expect(countSolutionMistakes(statement)).toBe(0);
    });

    it('returns 1 when one blank has an incorrect answer', () => {
      const statement: Solution = {
        id: 'test-3',
        title: 'Test Statement',
        parts: [
          {
            type: ClozePartType.blank,
            availableAnswers: ['apple', 'orange'],
            correctAnswerIndexes: [0],
            playerAnswerIndex: 1
          }
        ]
      };

      expect(countSolutionMistakes(statement)).toBe(1);
    });

    it('counts multiple incorrect blanks', () => {
      const statement: Solution = {
        id: 'test-4',
        title: 'Test Statement',
        parts: [
          {
            type: ClozePartType.blank,
            availableAnswers: ['apple', 'orange'],
            correctAnswerIndexes: [0],
            playerAnswerIndex: 1
          },
          {
            type: ClozePartType.text,
            text: ' is a '
          },
          {
            type: ClozePartType.blank,
            availableAnswers: ['fruit', 'vegetable'],
            correctAnswerIndexes: [0],
            playerAnswerIndex: 1
          },
          {
            type: ClozePartType.text,
            text: '.'
          },
          {
            type: ClozePartType.blank,
            availableAnswers: ['red', 'yellow'],
            correctAnswerIndexes: [0],
            playerAnswerIndex: 0
          }
        ]
      };

      expect(countSolutionMistakes(statement)).toBe(2);
    });

    it('recognizes multiple correct answers for a single blank', () => {
      const statement: Solution = {
        id: 'test-5',
        title: 'Test Statement',
        parts: [
          {
            type: ClozePartType.blank,
            availableAnswers: ['cat', 'dog', 'kitten'],
            correctAnswerIndexes: [0, 2],
            playerAnswerIndex: 2
          }
        ]
      };

      expect(countSolutionMistakes(statement)).toBe(0);
    });

    it('handles empty parts array', () => {
      const statement: Solution = {
        id: 'test-6',
        title: 'Empty Statement',
        parts: []
      };

      expect(countSolutionMistakes(statement)).toBe(0);
    });
  });
});

