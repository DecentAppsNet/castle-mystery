import { describe, expect, it, vi } from 'vitest';
import { createClozeBlankFromTemplateText } from '../parseConclusionUtil';
import ClozeCategory from '../types/ClozeCategory';

function _parseValidBlank(text:string, categories:Record<string, ClozeCategory>) {
  const reportError = vi.fn();
  const blank = createClozeBlankFromTemplateText(text, categories, reportError);
  expect(reportError).not.toHaveBeenCalled();
  expect(blank).not.toBeNull();
  return blank!;
}

describe('parseConclusionUtil', () => {
  describe('createClozeBlankFromTemplateText()', () => {
    it('retains exact characters provenance and ordered options without legacy properties', () => {
      const blank = _parseValidBlank('Sam', {
        characters:{ id:'characters', authoredName:'Characters', allowedValues:['Pat', 'Sam'] }
      });
      expect(blank.answerSet).toEqual({ id:'characters', sourceCategoryIds:['characters'], answers:['Pat', 'Sam'] });
      expect(blank).not.toHaveProperty('availableAnswers');
      expect(blank.correctAnswerIndexes).toEqual([1]);
      expect(blank.playerAnswerIndex).toBe(-1);
    });

    it('retains exact items provenance', () => {
      const blank = _parseValidBlank('Key', {
        items:{ id:'items', authoredName:'Items', allowedValues:['Key', 'Book'] }
      });
      expect(blank.answerSet.id).toBe('items');
    });

    it('retains exact rooms provenance', () => {
      const blank = _parseValidBlank('Study', {
        rooms:{ id:'rooms', authoredName:'Rooms', allowedValues:['Study', 'Hall'] }
      });
      expect(blank.answerSet.id).toBe('rooms');
      expect(blank.answerSet.answers).toEqual(['Study', 'Hall']);
    });

    it('rejects alternatives in different categories instead of combining them', () => {
      const reportError = vi.fn();
      const blank = createClozeBlankFromTemplateText('Sam|Hall', {
        rooms:{ id:'rooms', authoredName:'Rooms', allowedValues:['Hall'] },
        characters:{ id:'characters', authoredName:'Characters', allowedValues:['Sam', 'Pat'] }
      }, reportError);
      expect(blank).toBeNull();
      expect(reportError).toHaveBeenCalledWith(expect.stringContaining('All alternatives in a blank must use the same category'));
    });

    it('rejects ambiguous answers rather than constructing a combined set', () => {
      const reportError = vi.fn();
      const rooms = { id:'rooms', authoredName:'Rooms', allowedValues:['Hall', 'Sam'] };
      const characters = { id:'characters', authoredName:'Characters', allowedValues:['Sam', 'Pat'] };
      const blank = createClozeBlankFromTemplateText('Sam', { rooms, characters }, reportError);
      expect(blank).toBeNull();
      expect(reportError).toHaveBeenCalledWith(expect.stringContaining('found 2'));
    });

    it('does not mutate frozen categories or their allowed values', () => {
      const allowedValues = ['Pat', 'Sam'];
      Object.freeze(allowedValues);
      const characters = Object.freeze({ id:'characters', authoredName:'Characters', allowedValues });
      const categories = Object.freeze({ characters });
      const blank = _parseValidBlank('Sam|Pat', categories);
      expect(allowedValues).toEqual(['Pat', 'Sam']);
      expect(blank.answerSet.answers).toEqual(['Pat', 'Sam']);
      expect(blank.correctAnswerIndexes).toEqual([1, 0]);
    });

    it('rejects unknown answers rather than creating fallback-only sets', () => {
      const reportError = vi.fn();
      const blank = createClozeBlankFromTemplateText('Nobody|Someone', {}, reportError);
      expect(blank).toBeNull();
      expect(reportError).toHaveBeenCalledTimes(2);
      expect(reportError).toHaveBeenCalledWith(expect.stringContaining('Answer "Nobody"'));
      expect(reportError).toHaveBeenCalledWith(expect.stringContaining('Answer "Someone"'));
    });

    it('rejects unknown alternatives even when another alternative resolves', () => {
      const reportError = vi.fn();
      const categories = { characters:{ id:'characters', authoredName:'Characters', allowedValues:['Pat', 'Sam'] } };
      const blank = createClozeBlankFromTemplateText('Sam|Nobody', categories, reportError);
      expect(blank).toBeNull();
      expect(reportError).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Answer "Nobody"'));
    });

    it('accepts normalized matches while retaining the transitional answer-array builder', () => {
      const blank = _parseValidBlank('SAM', {
        characters:{ id:'characters', authoredName:'Characters', allowedValues:['Pat', 'Sam'] }
      });
      expect(blank.answerSet.answers).toEqual(['Pat', 'Sam', 'SAM']);
      expect(blank.correctAnswerIndexes).toEqual([1]);
      expect(blank.answerSet.id).not.toBe('characters');
    });

    it('rejects an empty blank without constructing an answer set', () => {
      const reportError = vi.fn();
      expect(createClozeBlankFromTemplateText('', {}, reportError)).toBeNull();
      expect(reportError).toHaveBeenCalledWith(expect.stringContaining('no correct answers'));
    });

    it('rejects whitespace and separator-only blanks', () => {
      const reportError = vi.fn();
      expect(createClozeBlankFromTemplateText(' |  | ', {}, reportError)).toBeNull();
      expect(reportError).toHaveBeenCalledWith(expect.stringContaining('no correct answers'));
    });
  });
});