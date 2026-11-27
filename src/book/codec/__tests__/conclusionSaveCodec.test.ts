import { describe, expect, it } from 'vitest';
import ClozeBlank, { UNSPECIFIED_ANSWER } from '@/conclusions/types/ClozeBlank';
import SavedBookConclusion from '@/persistence/types/SavedBookConclusion';
import { decodeBookConclusion, encodeBookConclusion } from '../conclusionSaveCodec';
import fixtureText from './fixtures/savedConclusion.json?raw';

const save = JSON.parse(fixtureText) as SavedBookConclusion;

function _decodeFixture() {
  const conclusion = decodeBookConclusion(save);
  expect(conclusion).not.toBeNull();
  return conclusion!;
}

describe('conclusionSaveCodec', () => {
  it('round-trips every part variant, ordered options, flags and incorrect guesses', () => {
    expect(encodeBookConclusion(_decodeFixture())).toEqual(save);
  });

  it('round-trips live progress through JSON without sharing mutable state with the original', () => {
    const original = _decodeFixture();
    original.isComplete = true;
    original.isLocked = false;
    original.isOptional = false;
    const originalBlank = original.parts[1] as ClozeBlank;
    originalBlank.playerAnswerIndex = 1;
    const snapshot = encodeBookConclusion(original);
    const restored = decodeBookConclusion(JSON.parse(JSON.stringify(snapshot)));
    expect(restored).toEqual(original);
    expect(restored).not.toBe(original);
    expect((restored?.parts[1] as ClozeBlank).correctAnswerIndexes).not.toBe(originalBlank.correctAnswerIndexes);
    originalBlank.correctAnswerIndexes.pop();
    expect(snapshot.parts[1]).toMatchObject({ correctAnswerIndexes:[0, 1] });
  });

  it('shares each hydrated answer set but keeps blank indexes and selections independent', () => {
    const { parts } = _decodeFixture();
    const first = parts[1] as ClozeBlank;
    const second = parts[2] as ClozeBlank;
    const other = parts[5] as ClozeBlank;
    expect(first.answerSet).toBe(second.answerSet);
    expect(first.answerSet).not.toBe(other.answerSet);
    expect(first.answerSet.id).toBe(first.answerSet.sourceCategoryId);
    expect(first.answerSet.answers).not.toBe(save.answerSets[0].answers);
    first.correctAnswerIndexes.pop();
    first.playerAnswerIndex = 1;
    expect(second.correctAnswerIndexes).toEqual([0, 1]);
    expect(second.playerAnswerIndex).toBe(UNSPECIFIED_ANSWER);
  });

  it('rejects a missing answer-set reference', () => {
    expect(decodeBookConclusion({ ...save, answerSets:save.answerSets.slice(0, 1) })).toBeNull();
  });

  it('rejects an out-of-range correct answer', () => {
    expect(decodeBookConclusion({ ...save, parts:[{ type:'blank', answerSetI:0,
      correctAnswerIndexes:[2], playerAnswerIndex:UNSPECIFIED_ANSWER }] })).toBeNull();
  });

  it('rejects an out-of-range player selection', () => {
    expect(decodeBookConclusion({ ...save, parts:[{ type:'blank', answerSetI:0,
      correctAnswerIndexes:[0], playerAnswerIndex:2 }] })).toBeNull();
  });

  it('rejects negative selections other than the unspecified sentinel', () => {
    expect(decodeBookConclusion({ ...save, parts:[{ type:'blank', answerSetI:0,
      correctAnswerIndexes:[0], playerAnswerIndex:-2 }] })).toBeNull();
  });
});