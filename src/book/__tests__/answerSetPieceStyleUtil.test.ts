import { describe, expect, it } from 'vitest';
import { createAnswerSet } from '@/conclusions';
import AnswerSet from '@/conclusions/types/AnswerSet';
import ClozeBlank from '@/conclusions/types/ClozeBlank';
import Conclusion from '@/conclusions/types/Conclusion';
import { generateAnswerSetIdToPieceStyleNoMap } from '../answerSetPieceStyleUtil';

function _createConclusion(answerSets:readonly AnswerSet[], id:string = 'one'):Conclusion {
  return {
    id, title:id,
    parts:answerSets.map(answerSet => ({ type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:-1 })),
    isComplete:false, isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[]
  };
}

describe('answerSetPieceStyleUtil', () => {
  describe('generateAnswerSetIdToPieceStyleNoMap()', () => {
    it('returns an empty prototype-free lookup when there are no blanks', () => {
      const conclusion = _createConclusion([]);
      conclusion.parts = [{ type:'text', text:'No blanks' }, { type:'image', imageUrl:'/example.png' }, { type:'separator' }];
      const styles = generateAnswerSetIdToPieceStyleNoMap(conclusion);
      expect(Object.keys(styles)).toEqual([]);
      expect(Object.getPrototypeOf(styles)).toBeNull();
      expect(styles.constructor).toBeUndefined();
    });

    it('reserves built-in styles regardless of their appearance order', () => {
      const rooms = createAnswerSet(['Hall'], 'rooms');
      const items = createAnswerSet(['Key'], 'items');
      const characters = createAnswerSet(['Sam'], 'characters');
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([rooms, items, characters]));
      expect([styles[characters.id], styles[items.id], styles[rooms.id]]).toEqual([0, 1, 2]);
    });

    it('keeps absent built-in styles reserved without consuming custom numbers', () => {
      const first = createAnswerSet(['found'], 'verbs');
      const rooms = createAnswerSet(['Hall'], 'rooms');
      const second = createAnswerSet(['Nobody'], 'unknown-people');
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([first, rooms, second]));
      expect([styles[first.id], styles[rooms.id], styles[second.id]]).toEqual([3, 2, 4]);
      expect(styles.characters).toBeUndefined();
      expect(styles.items).toBeUndefined();
    });

    it('assigns custom styles in first-appearance order beyond eight without wrapping', () => {
      const sets = Array.from({ length:10 }, (_, index) => createAnswerSet([String(index)], `category-${index}`));
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('uses category IDs for extended built-ins', () => {
      const characters = createAnswerSet(['Sam', 'Nobody'], 'characters');
      const items = createAnswerSet(['Key', 'Nothing'], 'items');
      const rooms = createAnswerSet(['Hall', 'Nowhere'], 'rooms');
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([characters, items, rooms]));
      expect(characters.id).toBe('characters');
      expect([styles[characters.id], styles[items.id], styles[rooms.id]]).toEqual([0, 1, 2]);
    });

    it('reuses the characters style for repeated blanks including replacement distractors', () => {
      const characters = createAnswerSet(['Sam', 'Nobody'], 'characters');
      const custom = createAnswerSet(['found'], 'verbs');
      const sets = [characters, custom, characters];
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([0, 3, 0]);
      expect(Object.keys(styles)).toEqual([characters.id, custom.id]);
    });

    it('reuses the items style for repeated blanks including replacement distractors', () => {
      const items = createAnswerSet(['Key', 'Nothing'], 'items');
      const custom = createAnswerSet(['found'], 'verbs');
      const sets = [custom, items, items];
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([3, 1, 1]);
      expect(Object.keys(styles)).toEqual([custom.id, items.id]);
    });

    it('reuses the rooms style for repeated blanks including replacement distractors', () => {
      const rooms = createAnswerSet(['Hall', 'Nowhere'], 'rooms');
      const custom = createAnswerSet(['found'], 'verbs');
      const sets = [rooms, rooms, custom];
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([2, 2, 3]);
      expect(Object.keys(styles)).toEqual([rooms.id, custom.id]);
    });

    it('reuses a repeated custom category without advancing first-appearance numbering', () => {
      const first = createAnswerSet(['found', 'lost'], 'verbs');
      const second = createAnswerSet(['quickly'], 'adverbs');
      const third = createAnswerSet(['yesterday'], 'times');
      const sets = [first, first, second, first, third];
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([3, 3, 4, 3, 5]);
      expect(Object.keys(styles)).toEqual([first.id, second.id, third.id]);
    });

    it('does not merge distinct categories with matching membership or rewrite indexes and options', () => {
      // Controlled overlapping input isolates style assignment; category validation belongs to level loading.
      const first = createAnswerSet(['B', 'A'], 'verbs');
      const second = createAnswerSet(['A', 'B'], 'alternate-verbs');
      const conclusion = _createConclusion([first, second]);
      const blank = conclusion.parts[1] as ClozeBlank;
      blank.playerAnswerIndex = 1;

      // Membership order must not affect category styles or the blank's live answer references.
      const styles = generateAnswerSetIdToPieceStyleNoMap(conclusion);
      expect(first.id).not.toBe(second.id);
      expect([styles[first.id], styles[second.id]]).toEqual([3, 4]);
      expect(first.answers).toEqual(['B', 'A']);
      expect(second.answers).toEqual(['A', 'B']);
      expect(blank.answerSet).toBe(second);
      expect(blank.playerAnswerIndex).toBe(1);
      expect(blank.correctAnswerIndexes).toEqual([0]);
      expect(blank.answerSet.answers[blank.playerAnswerIndex]).toBe('B');
    });

    it('keeps exact case, whitespace, subsets, and overlapping membership distinct', () => {
      const sets = [['A'], ['a'], [' A'], ['A', 'B'], ['B', 'C']]
        .map((answers, index) => createAnswerSet(answers, `category-${index}`));
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([3, 4, 5, 6, 7]);
    });

    it('supports prototype-like IDs without inheriting entries', () => {
      const sets = ['__proto__', 'constructor', 'tostring'].map(id => createAnswerSet([id], id));
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([3, 4, 5]);
      expect(Object.getPrototypeOf(styles)).toBeNull();
    });

    it('is deterministic with frozen source data and ignores completion, locking, and selection', () => {
      // Freeze every input layer while two blanks share the same answer set.
      const set = createAnswerSet(Object.freeze(['B', 'A']), 'frozen-options');
      Object.freeze(set);
      const conclusion = _createConclusion([set, set]);
      const before = structuredClone(conclusion);
      for (const part of conclusion.parts) {
        const blank = part as ClozeBlank;
        Object.freeze(blank.correctAnswerIndexes);
        Object.freeze(blank);
      }
      Object.freeze(conclusion.parts);
      Object.freeze(conclusion);

      // Selection and conclusion state must not change the lookup or mutate frozen source data.
      const styles = generateAnswerSetIdToPieceStyleNoMap(conclusion);
      expect(styles[set.id]).toBe(3);
      expect(Object.keys(styles)).toEqual([set.id]);
      Object.freeze(styles);
      const again = generateAnswerSetIdToPieceStyleNoMap({ ...conclusion, isComplete:true, isLocked:true,
        parts:conclusion.parts.map((part, index) => ({ ...part as ClozeBlank, playerAnswerIndex:index })) });
      expect(again).toEqual(styles);
      expect(again).not.toBe(styles);
      expect(conclusion).toEqual(before);
    });

    it('keeps custom assignment independent across conclusions', () => {
      const shared = createAnswerSet(['Shared'], 'shared-options');
      const other = createAnswerSet(['Other'], 'other-options');
      const first = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([other, shared], 'first'));
      const second = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([shared], 'second'));
      expect(first[shared.id]).toBe(4);
      expect(second[shared.id]).toBe(3);
    });
  });

});