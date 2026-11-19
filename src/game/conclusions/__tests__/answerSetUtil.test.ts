import { describe, expect, it } from 'vitest';
import { createAnswerSet } from '../answerSetUtil';
import ClozeBlank, { duplicateClozeBlank } from '../types/ClozeBlank';
import { duplicateConclusion } from '../types/Conclusion';

describe('answerSetUtil', () => {
  describe('createAnswerSet()', () => {
    it('uses the characters category as its identity', () => {
      expect(createAnswerSet(['Sam', 'Pat'], 'characters')).toEqual({
        id:'characters', sourceCategoryId:'characters', answers:['Sam', 'Pat']
      });
    });

    it('uses the items category as its identity', () => {
      expect(createAnswerSet(['Key'], 'items').id).toBe('items');
    });

    it('uses the rooms category as its identity', () => {
      expect(createAnswerSet(['Hall'], 'rooms').id).toBe('rooms');
    });

    it('uses a normalized custom category as its identity without extra fields', () => {
      expect(createAnswerSet(['Hid', 'Painted'], 'possible actions')).toEqual({
        id:'possible actions', sourceCategoryId:'possible actions', answers:['Hid', 'Painted']
      });
    });

    it('keeps distinct category identities even for identical membership', () => {
      const first = createAnswerSet(['Sam', 'Pat'], 'characters');
      const second = createAnswerSet(['Sam', 'Pat'], 'suspects');
      expect(first.id).not.toBe(second.id);
      expect(first.sourceCategoryId).toBe('characters');
      expect(second.sourceCategoryId).toBe('suspects');
    });

    it('does not globally intern the same category across different local memberships', () => {
      const firstAnswers = Object.freeze(['Sam', 'Pat']);
      const secondAnswers = Object.freeze(['Quinn', 'Nobody']);
      const first = createAnswerSet(firstAnswers, 'characters');
      const second = createAnswerSet(secondAnswers, 'characters');
      expect(first.id).toBe(second.id);
      expect(first).not.toBe(second);
      expect(first.answers).toBe(firstAnswers);
      expect(second.answers).toBe(secondAnswers);
    });

    it('shares frozen input without changing its order, spelling or repetitions', () => {
      const answers = Object.freeze([' Pat ', 'sAM', ' Pat ']);
      const answerSet = createAnswerSet(answers, 'characters');
      expect(answerSet.answers).toBe(answers);
      expect(answerSet.answers).toEqual([' Pat ', 'sAM', ' Pat ']);
      expect(answerSet.id).toBe('characters');
    });

    it('asserts rather than normalizing an uppercase category', () => {
      expect(() => createAnswerSet(['Sam'], 'Characters')).toThrow('Assertion failed.');
    });

    it('asserts rather than trimming a category', () => {
      expect(() => createAnswerSet(['Sam'], ' characters')).toThrow('Assertion failed.');
      expect(() => createAnswerSet(['Sam'], 'characters ')).toThrow('Assertion failed.');
    });
  });

  describe('duplicateClozeBlank()', () => {
    it('shares the authoritative frozen answer set without adding legacy options', () => {
      const answers = Object.freeze(['B', 'A']);
      const answerSet = Object.freeze(createAnswerSet(answers, 'characters'));
      const blank = { type:'blank' as const, answerSet,
        correctAnswerIndexes:[1], playerAnswerIndex:0 };
      const copy = duplicateClozeBlank(blank);
      expect(copy).toEqual(blank);
      expect(copy).not.toBe(blank);
      expect(copy.answerSet).toBe(answerSet);
      expect(copy.answerSet.answers).toBe(answers);
      expect(copy).not.toHaveProperty('availableAnswers');
    });

    it('keeps selection and mutable correct-answer indexes independent', () => {
      const blank = { type:'blank' as const, answerSet:createAnswerSet(['B', 'A'], 'characters'),
        correctAnswerIndexes:[1], playerAnswerIndex:-1 };
      const copy = duplicateClozeBlank(blank);
      expect(copy.correctAnswerIndexes).not.toBe(blank.correctAnswerIndexes);
      copy.correctAnswerIndexes[0] = 0;
      copy.playerAnswerIndex = 1;
      expect(blank.correctAnswerIndexes).toEqual([1]);
      expect(blank.playerAnswerIndex).toBe(-1);
      blank.correctAnswerIndexes.push(0);
      blank.playerAnswerIndex = 0;
      expect(copy.correctAnswerIndexes).toEqual([0]);
      expect(copy.playerAnswerIndex).toBe(1);
    });
  });

  describe('duplicateConclusion()', () => {
    it('shares frozen answer sets while keeping blank indexes and selections independent', () => {
      const answerSet = Object.freeze(createAnswerSet(Object.freeze(['Pat', 'Sam']), 'characters'));
      const blank = { type:'blank' as const, answerSet, correctAnswerIndexes:[1], playerAnswerIndex:-1 };
      const copy = duplicateConclusion({ id:'mystery', title:'Mystery', parts:[blank],
        isComplete:false, isLocked:false, unlockConclusionIds:[], revealRoomIds:[] });
      const copiedBlank = copy.parts[0] as ClozeBlank;
      expect(copiedBlank.type).toBe('blank');
      expect(copiedBlank).not.toBe(blank);
      expect(copiedBlank.answerSet).toBe(answerSet);
      expect(copiedBlank.correctAnswerIndexes).not.toBe(blank.correctAnswerIndexes);
      copiedBlank.correctAnswerIndexes[0] = 0;
      copiedBlank.playerAnswerIndex = 0;
      expect(blank.correctAnswerIndexes).toEqual([1]);
      expect(blank.playerAnswerIndex).toBe(-1);
    });
  });
});