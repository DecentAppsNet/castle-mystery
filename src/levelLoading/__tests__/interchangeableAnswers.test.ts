import { afterEach, describe, expect, it } from 'vitest';
import { clearSeed, setSeed } from '@/common/randUtil';
import { countConclusionMistakes } from '@/game/conclusions/conclusionUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { duplicateConclusion } from '@/game/conclusions/types/Conclusion';
import { claimConclusion } from '@/homeScreen/conclusionsView/interactions/conclusions';
import { loadLevelForTest, loadValidLevelForTest } from './testLevelUtil';
import text from './fixtures/interchangeable-answers.md?raw';
import charactersText from './fixtures/conclusions-effective-characters.md?raw';

function _loadMystery(source = text) {
  const level = loadValidLevelForTest(source);
  const conclusion = level.conclusions.find(candidate => candidate.id === 'mystery')!;
  const blanks = conclusion.parts.filter(part => part.type === 'blank') as ClozeBlank[];
  return { level, conclusion, blanks };
}

describe('loading and claiming interchangeable answers', () => {
  afterEach(clearSeed);

  it('accepts both distinct Jack/Jill permutations and claims completion without mutating the input', () => {
    const { conclusion, blanks } = _loadMystery();
    blanks[0].playerAnswerIndex = 0;
    blanks[1].playerAnswerIndex = 1;
    expect(countConclusionMistakes(conclusion)).toBe(0);
    let completed = false;
    expect(claimConclusion(conclusion, () => {}, updated => { completed = updated.isComplete; })).toBe(true);
    expect(completed).toBe(true);
    expect(conclusion.isComplete).toBe(false);
    blanks[0].playerAnswerIndex = 1;
    blanks[1].playerAnswerIndex = 0;
    expect(countConclusionMistakes(conclusion)).toBe(0);
  });

  it('rejects both duplicate permutations through correctness and claiming', () => {
    const { conclusion, blanks } = _loadMystery();
    blanks[0].playerAnswerIndex = 0;
    blanks[1].playerAnswerIndex = 0;
    expect(countConclusionMistakes(conclusion)).toBe(1);
    expect(claimConclusion(conclusion, () => { throw Error('Must not close'); }, () => { throw Error('Must not complete'); })).toBe(false);
    blanks[0].playerAnswerIndex = 1;
    blanks[1].playerAnswerIndex = 1;
    expect(countConclusionMistakes(conclusion)).toBe(1);
  });

  it('shares immutable same-category sets but preserves indexes and independent selection state', () => {
    const { conclusion, blanks, level } = _loadMystery();
    Object.freeze(blanks[0].answerSet.answers);
    Object.freeze(blanks[0].answerSet);
    expect(blanks[1].answerSet).toBe(blanks[0].answerSet);
    expect(blanks.map(blank => blank.correctAnswerIndexes)).toEqual([[0, 1], [1, 0]]);
    expect(blanks.map(blank => blank.playerAnswerIndex)).toEqual([-1, -1]);
    const copy = duplicateConclusion(conclusion);
    const copies = copy.parts.filter(part => part.type === 'blank') as ClozeBlank[];
    copies[0].playerAnswerIndex = 1;
    expect(copies[1].answerSet).toBe(blanks[0].answerSet);
    expect(blanks[0].playerAnswerIndex).toBe(-1);
    expect(copies[1].playerAnswerIndex).toBe(-1);
    const other = level.conclusions.find(candidate => candidate.id === 'other')!.parts[0] as ClozeBlank;
    expect(other.answerSet).not.toBe(blanks[0].answerSet);
  });

  it('accepts disjoint alternatives from the same category', () => {
    const { blanks } = _loadMystery(text.replace('[Jill|Jack]', '[Nobody]'));
    expect(blanks[1].answerSet).toBe(blanks[0].answerSet);
    expect(blanks[1].correctAnswerIndexes).toEqual([2]);
  });

  it('ignores normalized repetitions and alternative order within an identical group', () => {
    const { blanks } = _loadMystery(text.replace('[Jack|Jill]', '[ jack |JILL|Jack]'));
    expect(blanks.map(blank => blank.correctAnswerIndexes)).toEqual([[0, 1], [1, 0]]);
  });

  it('rejects partial intersections with both blank positions, answer, and source location', () => {
    const { level, errors } = loadLevelForTest(text.replace('[Jill|Jack]', '[Jack]'), 'partial.md');
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('partial.md:');
    expect(errors.describeErrors()).toContain('Conclusion "Mystery", blanks 1 and 2 partially overlap on "jack"');
    expect(errors.describeErrors()).toContain('Use disjoint or identical alternative sets');
  });

  it('rejects repeated singleton answers even when one blank repeats its alternative', () => {
    const source = text.replace('[Jack|Jill]', '[Jack|JACK]').replace('[Jill|Jack]', '[jack]');
    const { level, errors } = loadLevelForTest(source);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('blanks 1, 2 require more distinct answers');
  });

  it('rejects groups larger than their distinct alternative capacity', () => {
    const { level, errors } = loadLevelForTest(text.replace('and [Jill|Jack].', 'and [Jill|Jack] and [Jack|Jill].'));
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('blanks 1, 2, 3 require more distinct answers');
  });

  it('keeps conclusions and successive loads independent after valid and invalid loads', () => {
    const first = _loadMystery();
    loadLevelForTest(text.replace('[Jill|Jack]', '[Jack]'));
    const second = _loadMystery();
    expect(second.blanks[0].answerSet).not.toBe(first.blanks[0].answerSet);
    first.blanks[0].playerAnswerIndex = 0;
    expect(second.blanks[0].playerAnswerIndex).toBe(-1);
  });

  it('rejects generated identities with duplicate normalized required titles', () => {
    setSeed(1);
    const { level, errors } = loadLevelForTest(charactersText.replace('* title=Witness Quinn', '* title=detective SAM'));
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Conclusion "Identities", blanks 1, 2');
    expect(errors.describeErrors()).toContain('detective sam');
  });

  it('shares generated identity sets without sharing the rows mutable selections', () => {
    setSeed(1);
    const level = loadValidLevelForTest(charactersText);
    const blanks = level.conclusions[0].parts.filter(part => part.type === 'blank') as ClozeBlank[];
    expect(blanks).toHaveLength(2);
    expect(blanks[0].answerSet).toBe(blanks[1].answerSet);
    blanks[0].playerAnswerIndex = 0;
    expect(blanks[1].playerAnswerIndex).toBe(-1);
  });
});