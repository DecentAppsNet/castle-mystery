import { describe, expect, it } from 'vitest';
import { createAnswerSet } from '../answerSetUtil';

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

});