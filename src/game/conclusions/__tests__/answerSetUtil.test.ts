import { describe, expect, it } from 'vitest';
import { isNormalizedId } from '@/game/idUtil';
import { createAnswerSet } from '../answerSetUtil';
import { duplicateClozeBlank } from '../types/ClozeBlank';

describe('answerSetUtil', () => {
  describe('createAnswerSet()', () => {
    it('reserves the exact characters category identity', () => {
      expect(createAnswerSet(['Sam', 'Pat'], ['characters'], true).id).toBe('characters');
    });

    it('reserves the exact items category identity', () => {
      expect(createAnswerSet(['Key'], ['items'], true).id).toBe('items');
    });

    it('reserves the exact rooms category identity', () => {
      expect(createAnswerSet(['Hall'], ['rooms'], true).id).toBe('rooms');
    });

    it('generates identities for exact custom categories rather than using authored IDs', () => {
      const answerSet = createAnswerSet(['A'], ['verbs'], true);
      expect(answerSet.id).toMatch(/^answer-set-[0-9a-f]+$/);
      expect(answerSet.id).not.toBe('verbs');
    });

    it('canonicalizes duplicated and reordered sources without changing the inputs', () => {
      const answers = Object.freeze(['B', 'A']);
      const sources = Object.freeze(['rooms', 'characters', 'rooms']);
      const answerSet = createAnswerSet(answers, sources, false);
      expect(answerSet.id).toBe(createAnswerSet(['A', 'B'], ['characters', 'rooms'], false).id);
      expect(answerSet.sourceCategoryIds).toEqual(['characters', 'rooms']);
      expect(answerSet.answers).toBe(answers);
      expect(answers).toEqual(['B', 'A']);
      expect(sources).toEqual(['rooms', 'characters', 'rooms']);
    });

    it('distinguishes source IDs that would collide when joined with underscores', () => {
      expect(createAnswerSet(['A'], ['a_b', 'c'], false).id)
        .not.toBe(createAnswerSet(['A'], ['a', 'b_c'], false).id);
    });

    it('distinguishes answer boundaries and embedded serialization punctuation', () => {
      expect(createAnswerSet(['a_b', 'c'], [], false).id)
        .not.toBe(createAnswerSet(['a', 'b_c'], [], false).id);
      expect(createAnswerSet(['a","b'], [], false).id)
        .not.toBe(createAnswerSet(['a', 'b'], [], false).id);
    });

    it('includes extra answers in identities even when category provenance is unchanged', () => {
      const extended = createAnswerSet(['Sam', 'Nobody'], ['characters'], false);
      expect(extended.id).not.toBe('characters');
      expect(extended.id).not.toBe(createAnswerSet(['Sam', 'Someone'], ['characters'], false).id);
      expect(extended.sourceCategoryIds).toEqual(['characters']);
    });

    it('distinguishes exact case and whitespace in answer membership', () => {
      const id = createAnswerSet(['Amos'], [], false).id;
      expect(id).not.toBe(createAnswerSet(['amos'], [], false).id);
      expect(id).not.toBe(createAnswerSet([' Amos'], [], false).id);
      expect(id).not.toBe(createAnswerSet(['Amos '], [], false).id);
    });

    it('canonicalizes membership without deduplicating or sorting the live options', () => {
      const answers = ['B', 'A', 'B'];
      const answerSet = createAnswerSet(answers, [], false);
      expect(answerSet.id).toBe(createAnswerSet(['A', 'B'], [], false).id);
      expect(answerSet.answers).toBe(answers);
      expect(answerSet.answers).toEqual(['B', 'A', 'B']);
    });

    it('losslessly encodes UTF-16 membership into normalized deterministic identities', () => {
      const answerSet = createAnswerSet(['😀', '\ud800', '\u0000'], [], false);
      const payload = answerSet.id.slice('answer-set-'.length);
      const decoded = payload.match(/.{4}/g)!.map(unit => String.fromCharCode(parseInt(unit, 16))).join('');
      expect(JSON.parse(decoded)).toEqual([[], ['\u0000', '\ud800', '😀']]);
      expect(isNormalizedId(answerSet.id)).toBe(true);
      expect(answerSet.id).toBe(createAnswerSet(['😀', '\ud800', '\u0000'], [], false).id);
      expect(answerSet.id).not.toBe(createAnswerSet(['😁', '\ud800', '\u0000'], [], false).id);
    });
  });

  describe('duplicateClozeBlank() migration metadata', () => {
    it('shares immutable metadata while copying legacy arrays and selection state', () => {
      const answers = ['B', 'A'];
      const answerSet = Object.freeze(createAnswerSet(answers, [], false));
      const blank = { type:'blank' as const, availableAnswers:answers, answerSet,
        correctAnswerIndexes:[1], playerAnswerIndex:0 };
      const copy = duplicateClozeBlank(blank);
      expect(copy.answerSet).toBe(answerSet);
      expect(copy.availableAnswers).toEqual(answers);
      expect(copy.availableAnswers).not.toBe(answers);
      expect(copy.correctAnswerIndexes).not.toBe(blank.correctAnswerIndexes);
      copy.playerAnswerIndex = 1;
      expect(blank.playerAnswerIndex).toBe(0);
    });

    it('preserves legacy blanks without adding absent metadata', () => {
      const blank = { type:'blank' as const, availableAnswers:['A'], correctAnswerIndexes:[0], playerAnswerIndex:-1 };
      expect(duplicateClozeBlank(blank)).toEqual(blank);
      expect(duplicateClozeBlank(blank)).not.toHaveProperty('answerSet');
    });
  });
});