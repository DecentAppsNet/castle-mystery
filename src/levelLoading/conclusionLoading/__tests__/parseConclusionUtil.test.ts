import { describe, expect, it } from 'vitest';
import { createClozeBlankFromTemplateText } from '../parseConclusionUtil';

describe('parseConclusionUtil', () => {
  describe('createClozeBlankFromTemplateText()', () => {
    it('retains exact characters provenance and ordered options without legacy properties', () => {
      const blank = createClozeBlankFromTemplateText('Sam', {
        characters:{ id:'characters', authoredName:'Characters', allowedValues:['Pat', 'Sam'] }
      });
      expect(blank.answerSet).toEqual({ id:'characters', sourceCategoryIds:['characters'], answers:['Pat', 'Sam'] });
      expect(blank).not.toHaveProperty('availableAnswers');
      expect(blank.correctAnswerIndexes).toEqual([1]);
      expect(blank.playerAnswerIndex).toBe(-1);
    });

    it('retains exact items provenance', () => {
      const blank = createClozeBlankFromTemplateText('Key', {
        items:{ id:'items', authoredName:'Items', allowedValues:['Key', 'Book'] }
      });
      expect(blank.answerSet.id).toBe('items');
    });

    it('retains exact rooms provenance', () => {
      const blank = createClozeBlankFromTemplateText('Study', {
        rooms:{ id:'rooms', authoredName:'Rooms', allowedValues:['Study', 'Hall'] }
      });
      expect(blank.answerSet.id).toBe('rooms');
      expect(blank.answerSet.answers).toEqual(['Study', 'Hall']);
    });

    it('combines matching categories in traversal order with exact deduplication', () => {
      const blank = createClozeBlankFromTemplateText('Sam|Hall|Nobody|sam', {
        rooms:{ id:'rooms', authoredName:'Rooms', allowedValues:['Hall', 'Sam'] },
        unrelated:{ id:'unrelated', authoredName:'Unrelated', allowedValues:['Other'] },
        characters:{ id:'characters', authoredName:'Characters', allowedValues:['Sam', 'Pat', 'sam'] }
      });
      expect(blank.answerSet.answers).toEqual(['Hall', 'Sam', 'Pat', 'sam', 'Nobody']);
      expect(blank.correctAnswerIndexes).toEqual([1, 0, 4]);
      expect(blank.answerSet.sourceCategoryIds).toEqual(['characters', 'rooms']);
      expect(blank.answerSet.id).toMatch(/^answer-set-/);
    });

    it('gives reordered equivalent categories one identity without rewriting blank indexes', () => {
      const rooms = { id:'rooms', authoredName:'Rooms', allowedValues:['Hall', 'Sam'] };
      const characters = { id:'characters', authoredName:'Characters', allowedValues:['Sam', 'Pat'] };
      const first = createClozeBlankFromTemplateText('Sam', { rooms, characters });
      const second = createClozeBlankFromTemplateText('Sam', { characters, rooms });
      expect(first.answerSet.id).toBe(second.answerSet.id);
      expect(first.answerSet.answers).toEqual(['Hall', 'Sam', 'Pat']);
      expect(second.answerSet.answers).toEqual(['Sam', 'Pat', 'Hall']);
      expect(first.correctAnswerIndexes).toEqual([1]);
      expect(second.correctAnswerIndexes).toEqual([0]);
    });

    it('does not mutate frozen categories or their allowed values', () => {
      const allowedValues = ['Pat', 'Sam'];
      Object.freeze(allowedValues);
      const characters = Object.freeze({ id:'characters', authoredName:'Characters', allowedValues });
      const categories = Object.freeze({ characters });
      const blank = createClozeBlankFromTemplateText('Sam|Nobody', categories);
      expect(allowedValues).toEqual(['Pat', 'Sam']);
      expect(blank.answerSet.answers).toEqual(['Pat', 'Sam', 'Nobody']);
    });

    it('creates uncategorized fallback-only sets in first-encounter order', () => {
      const blank = createClozeBlankFromTemplateText('Nobody|Someone|Nobody', {});
      expect(blank.answerSet.answers).toEqual(['Nobody', 'Someone']);
      expect(blank.correctAnswerIndexes).toEqual([0, 1]);
      expect(blank.answerSet.sourceCategoryIds).toEqual([]);
      expect(blank.answerSet.id).toMatch(/^answer-set-/);
    });

    it('gives extended built-ins generated identities and distinguishes different fallback additions', () => {
      const categories = { characters:{ id:'characters', authoredName:'Characters', allowedValues:['Pat', 'Sam'] } };
      const first = createClozeBlankFromTemplateText('Sam|Nobody', categories);
      const second = createClozeBlankFromTemplateText('Sam|Someone', categories);
      expect(first.answerSet.id).not.toBe('characters');
      expect(first.answerSet.id).not.toBe(second.answerSet.id);
      expect(first.answerSet.sourceCategoryIds).toEqual(['characters']);
      expect(first.answerSet.answers).toEqual(['Pat', 'Sam', 'Nobody']);
      expect(first.correctAnswerIndexes).toEqual([1, 2]);
    });

    it('preserves normalized matching while treating differently spelled fallback options as extensions', () => {
      const blank = createClozeBlankFromTemplateText('SAM', {
        characters:{ id:'characters', authoredName:'Characters', allowedValues:['Pat', 'Sam'] }
      });
      expect(blank.answerSet.answers).toEqual(['Pat', 'Sam', 'SAM']);
      expect(blank.correctAnswerIndexes).toEqual([1]);
      expect(blank.answerSet.id).not.toBe('characters');
    });
  });
});