import { describe, expect, it } from 'vitest';
import baseText from './fixtures/conclusions-base.md?raw';
import effectiveCharactersText from './fixtures/conclusions-effective-characters.md?raw';
import blankText from './fixtures/conclusions-blank-validation.md?raw';
import { loadLevelForTest, loadValidLevelForTest } from './testLevelUtil';
import ClozeBlank from '@/conclusions/types/ClozeBlank';

describe('loading levels - blank validation', () => {
  it('reports an unknown alternative with conclusion, blank position, and source location', () => {
    const text = blankText.replace('[Detective Sam]', '[Detective Sam|Ghost]');
    const { level, errors } = loadLevelForTest(text, 'unknown-answer.md');

    expect(level).toBeNull();
    expect(errors.count).toBe(1);
    expect(errors.describeErrors()).toContain(`unknown-answer.md:${text.split('\n').findIndex(line => line.startsWith('* conclusion=')) + 1}:`);
    expect(errors.describeErrors()).toContain('Conclusion "Mystery", blank 2:');
    expect(errors.describeErrors()).toContain('Answer "Ghost"');
    expect(errors.describeErrors()).toContain('Add it to the intended category');
  });

  it('rejects a valid alternative followed by an answer from another category', () => {
    const { level, errors } = loadLevelForTest(blankText.replace('[Detective Sam]', '[Detective Sam|Study]'));

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"rooms"');
    expect(errors.describeErrors()).toContain('"characters"');
    expect(errors.describeErrors()).toContain('All alternatives in a blank must use the same category');
  });

  it('rejects literal empty brackets instead of treating them as ordinary text', () => {
    const { level, errors } = loadLevelForTest(blankText.replace('[Detective Sam]', '[]'));

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('blank 2: The blank has no correct answers');
  });

  it('rejects whitespace-only brackets', () => {
    const { level, errors } = loadLevelForTest(blankText.replace('[Detective Sam]', '[   ]'));

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('no correct answers');
  });

  it('rejects separator-only brackets', () => {
    const { level, errors } = loadLevelForTest(blankText.replace('[Detective Sam]', '[ | | ]'));

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('no correct answers');
  });

  it('accepts normalized category matches and preserves text, images, separators and dependencies', () => {
    const level = loadValidLevelForTest(blankText.replace('[Detective Sam]', '[  detective SAM  ]'));
    const mystery = level.conclusions.find(conclusion => conclusion.id === 'mystery')!;
    const blank = mystery.parts[4] as ClozeBlank;

    expect(mystery.parts.map(part => part.type)).toEqual(['image', 'blank', 'separator', 'text', 'blank', 'text']);
    expect(mystery.parts[0]).toMatchObject({ imageUrl:['/assets/conclusions/book.png', '/assets/bodies/book.png'] });
    expect(mystery.parts[3]).toEqual({ type:'text', text:'Named ' });
    expect(mystery.parts[5]).toEqual({ type:'text', text:'.' });
    expect(blank.answerSet.answers[blank.correctAnswerIndexes[0]]).toBe('Detective Sam');
    expect(mystery.revealRoomIds).toEqual(['study']);
    expect(mystery.unlockConclusionIds).toEqual(['aftermath']);
    expect(level.conclusions.find(conclusion => conclusion.id === 'aftermath')?.isLocked).toBe(true);
  });

  it('collects independent invalid blanks without publishing a partial level', () => {
    const { level, errors } = loadLevelForTest(blankText.replace('[Study]', '[Unknown Room]').replace('[Detective Sam]', '[Ghost]'));

    expect(level).toBeNull();
    expect(errors.count).toBe(2);
    expect(errors.describeErrors()).toContain('blank 1:');
    expect(errors.describeErrors()).toContain('blank 2:');
  });

  it('reports missing generated identity titles at the character definition', () => {
    const text = baseText.replace('# conclusions', '# conclusions\n* characters=Nobody');
    const { level, errors } = loadLevelForTest(text, 'missing-identity.md');

    expect(level).toBeNull();
    expect(errors.count).toBe(1);
    expect(errors.describeErrors()).toContain('missing-identity.md:');
    expect(errors.describeErrors()).toContain('Generated identities row 1 for "Detective Sam" (characters category)');
    expect(errors.describeErrors()).toContain('found 0');
  });

  it('rejects a known title required by authored identities without a character override', () => {
    const text = effectiveCharactersText.replace('## Mystery', '## Identities');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Conclusion "Identities", blank 1: Answer "Doctor Pat"');
  });

  it('collects missing answers from every generated identity row without suppressing invalid rows', () => {
    const text = effectiveCharactersText.replace('# conclusions', '# conclusions\n* characters=Doctor Pat|Nobody');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.count).toBe(2);
    expect(errors.describeErrors()).toContain('for "Detective Sam"');
    expect(errors.describeErrors()).toContain('for "Witness Quinn"');
  });
});