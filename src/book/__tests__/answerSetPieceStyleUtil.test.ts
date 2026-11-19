import { describe, expect, it } from 'vitest';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import AnswerSet from '@/game/conclusions/types/AnswerSet';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import Conclusion from '@/game/conclusions/types/Conclusion';
import { generateAnswerSetIdToPieceStyleNoMap } from '../answerSetPieceStyleUtil';

function _createConclusion(answerSets:readonly AnswerSet[], id:string = 'one'):Conclusion {
  return {
    id, title:id,
    parts:answerSets.map(answerSet => ({ type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:-1 })),
    isComplete:false, isLocked:false, unlockConclusionIds:[], revealRoomIds:[]
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
      const rooms = createAnswerSet(['Hall'], ['rooms'], true);
      const items = createAnswerSet(['Key'], ['items'], true);
      const characters = createAnswerSet(['Sam'], ['characters'], true);
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([rooms, items, characters]));
      expect([styles[characters.id], styles[items.id], styles[rooms.id]]).toEqual([0, 1, 2]);
    });

    it('keeps absent built-in styles reserved without consuming custom numbers', () => {
      const first = createAnswerSet(['found'], ['verbs'], true);
      const rooms = createAnswerSet(['Hall'], ['rooms'], true);
      const second = createAnswerSet(['Nobody'], [], false);
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([first, rooms, second]));
      expect([styles[first.id], styles[rooms.id], styles[second.id]]).toEqual([3, 2, 4]);
      expect(styles.characters).toBeUndefined();
      expect(styles.items).toBeUndefined();
    });

    it('assigns custom styles in first-appearance order beyond eight without wrapping', () => {
      const sets = Array.from({ length:10 }, (_, index) => createAnswerSet([String(index)], [], false));
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('uses provenance rather than generated IDs for extended built-ins', () => {
      const characters = createAnswerSet(['Sam', 'Nobody'], ['characters'], false);
      const items = createAnswerSet(['Key', 'Nothing'], ['items'], false);
      const rooms = createAnswerSet(['Hall', 'Nowhere'], ['rooms'], false);
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([characters, items, rooms]));
      expect(characters.id).not.toBe('characters');
      expect([styles[characters.id], styles[items.id], styles[rooms.id]]).toEqual([0, 1, 2]);
    });

    // TODO Phase 9: replace combined-category precedence with single-category style coverage.
    it.skip('prioritizes characters over items and rooms for combined sets', () => {
      const set = createAnswerSet(['Sam', 'Key', 'Hall'], ['rooms', 'items', 'characters', 'custom'], false);
      expect(generateAnswerSetIdToPieceStyleNoMap(_createConclusion([set]))[set.id]).toBe(0);
    });

    // TODO Phase 9: replace combined-category precedence with single-category style coverage.
    it.skip('prioritizes items over rooms for combined sets', () => {
      const set = createAnswerSet(['Key', 'Hall'], ['rooms', 'items'], false);
      expect(generateAnswerSetIdToPieceStyleNoMap(_createConclusion([set]))[set.id]).toBe(1);
    });

    // TODO Phase 9: replace combined-category precedence with single-category style coverage.
    it.skip('retains a rooms style when combined with a non-reserved category', () => {
      const set = createAnswerSet(['Hall', 'Outside'], ['places', 'rooms'], false);
      expect(generateAnswerSetIdToPieceStyleNoMap(_createConclusion([set]))[set.id]).toBe(2);
    });

    // TODO Phase 9: replace membership-alias precedence with category-based assignment coverage.
    it.skip('resolves later reserved aliases before numbering custom groups', () => {
      const unknown = createAnswerSet(['B', 'A', 'B'], [], false);
      const custom = createAnswerSet(['Other'], [], false);
      const rooms = createAnswerSet(['A', 'B'], ['rooms'], false);
      const items = createAnswerSet(['B', 'A'], ['items'], false);
      const characters = createAnswerSet(['A', 'B'], ['characters'], false);
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([unknown, custom, rooms, items, characters]));
      expect([unknown, rooms, items, characters].map(set => styles[set.id])).toEqual([0, 0, 0, 0]);
      expect(styles[custom.id]).toBe(3);
    });

    it('merges custom membership aliases without rewriting blank indexes or live options', () => {
      const first = createAnswerSet(['B', 'A'], ['verbs'], false);
      const second = createAnswerSet(['A', 'B'], [], false);
      const conclusion = _createConclusion([first, second]);
      const blank = conclusion.parts[1] as ClozeBlank;
      blank.playerAnswerIndex = 1;
      const styles = generateAnswerSetIdToPieceStyleNoMap(conclusion);
      expect(first.id).not.toBe(second.id);
      expect([styles[first.id], styles[second.id]]).toEqual([3, 3]);
      expect(first.answers).toEqual(['B', 'A']);
      expect(second.answers).toEqual(['A', 'B']);
      expect(blank.playerAnswerIndex).toBe(1);
      expect(blank.correctAnswerIndexes).toEqual([0]);
      expect(blank.answerSet.answers[blank.playerAnswerIndex]).toBe('B');
    });

    it('keeps exact case, whitespace, subsets, and overlapping membership distinct', () => {
      const sets = [['A'], ['a'], [' A'], ['A', 'B'], ['B', 'C']].map(answers => createAnswerSet(answers, [], false));
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([3, 4, 5, 6, 7]);
    });

    it('supports prototype-like IDs without inheriting entries', () => {
      const sets = ['__proto__', 'constructor', 'tostring'].map(id => ({ ...createAnswerSet([id], [], false), id }));
      const styles = generateAnswerSetIdToPieceStyleNoMap(_createConclusion(sets));
      expect(sets.map(set => styles[set.id])).toEqual([3, 4, 5]);
      expect(Object.getPrototypeOf(styles)).toBeNull();
    });

    it('is deterministic with frozen source data and ignores completion, locking, and selection', () => {
      const set = createAnswerSet(Object.freeze(['B', 'A']), [], false);
      Object.freeze(set.sourceCategoryIds);
      Object.freeze(set);
      const conclusion = _createConclusion([set]);
      const before = structuredClone(conclusion);
      const blank = conclusion.parts[0] as ClozeBlank;
      Object.freeze(blank.correctAnswerIndexes);
      Object.freeze(blank);
      Object.freeze(conclusion.parts);
      Object.freeze(conclusion);
      const styles = generateAnswerSetIdToPieceStyleNoMap(conclusion);
      Object.freeze(styles);
      const again = generateAnswerSetIdToPieceStyleNoMap({ ...conclusion, isComplete:true, isLocked:true,
        parts:[{ ...blank, playerAnswerIndex:1 }] });
      expect(again).toEqual(styles);
      expect(again).not.toBe(styles);
      expect(conclusion).toEqual(before);
    });

    it('keeps custom assignment independent across conclusions', () => {
      const shared = createAnswerSet(['Shared'], [], false);
      const other = createAnswerSet(['Other'], [], false);
      const first = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([other, shared], 'first'));
      const second = generateAnswerSetIdToPieceStyleNoMap(_createConclusion([shared], 'second'));
      expect(first[shared.id]).toBe(4);
      expect(second[shared.id]).toBe(3);
    });
  });

});