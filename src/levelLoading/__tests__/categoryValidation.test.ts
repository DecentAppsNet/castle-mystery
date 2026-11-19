import { describe, expect, it } from 'vitest';
import overlapText from './fixtures/conclusions-category-overlap.md?raw';
import replacementText from './fixtures/conclusions-category-replacement.md?raw';
import numberedItemsText from './fixtures/items/items-numbered.md?raw';
import { loadLevelForTest, loadValidLevelForTest } from './testLevelUtil';

describe('loading levels - category validation', () => {
  it('rejects an unused authored category overlapping a generated category with a source location', () => {
    const { level, errors } = loadLevelForTest(overlapText, 'category-overlap.md');

    expect(level).toBeNull();
    expect(errors.count).toBe(1);
    expect(errors.describeErrors()).toContain('category-overlap.md:33:');
    expect(errors.describeErrors()).toContain('Answer "Detective Sam"');
    expect(errors.describeErrors()).toContain('authored "suspects" category');
    expect(errors.describeErrors()).toContain('generated "characters" category');
    expect(errors.describeErrors()).toContain('or replace the generated category with the intended complete authored list.');
  });

  it('normalizes case and surrounding whitespace when checking category overlaps', () => {
    const text = overlapText.replace('* suspects=Detective Sam', '* suspects=  detective SAM  ');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.count).toBe(1);
    expect(errors.describeErrors()).toContain('overlaps between');
  });

  it('rejects case-insensitive duplicates inside an authored category', () => {
    const text = replacementText.replace('* suspects=Nobody', '* suspects=Nobody|NOBODY');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('authored "suspects" category repeats');
    expect(errors.describeErrors()).toContain('Remove or rename the duplicate entry');
  });

  it('rejects whitespace-equivalent duplicates rather than deduplicating authored options', () => {
    const text = replacementText.replace('* suspects=Nobody', '* suspects=Nobody | Nobody  ');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('repeats the answer "Nobody"');
  });

  it('rejects duplicate entries inside an authored built-in replacement', () => {
    const text = replacementText.replace('* rooms=Hall|Study', '* rooms=Hall|hall');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('authored "rooms" category repeats');
    expect(errors.describeErrors()).not.toContain('generated "rooms"');
  });

  it('identifies both authored categories when a replacement overlaps another authored category', () => {
    const text = replacementText.replace('* suspects=Nobody', '* suspects=Hall');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('authored "rooms" category');
    expect(errors.describeErrors()).toContain('authored "suspects" category');
    expect(errors.describeErrors()).not.toContain('generated "rooms"');
    expect(errors.describeErrors()).toContain('Remove or rename the overlap.');
    expect(errors.describeErrors()).not.toContain('or replace');
  });

  it('rejects overlaps between two generated categories even without matching conclusion blanks', () => {
    const text = overlapText.replace('* suspects=Detective Sam', '').replace('* title=Detective Sam', '* title=Hall');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.count).toBe(1);
    expect(errors.describeErrors()).toContain('generated "characters" category');
    expect(errors.describeErrors()).toContain('generated "rooms" category');
    expect(errors.describeErrors()).toContain('or replace either generated category with the intended complete authored list.');
  });

  it('validates replacements instead of rejecting an overlap removed by a complete replacement', () => {
    const level = loadValidLevelForTest(replacementText);
    const mystery = level.conclusions.find(conclusion => conclusion.id === 'mystery');

    expect(mystery?.parts[0]).toMatchObject({ answerSet:{ answers:['Hall', 'Study'] }, correctAnswerIndexes:[0] });
  });

  it('reports the generated overlap when the resolving replacement is removed', () => {
    const text = replacementText.replace('* rooms=Hall|Study', '');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('generated "characters" category');
    expect(errors.describeErrors()).toContain('generated "rooms" category');
  });

  it('collects independent category conflicts without parsing conclusions from invalid categories', () => {
    const text = replacementText.replace('* suspects=Nobody', '* suspects=Hall|Study')
      .replace('* conclusion=[Hall]', '* revealRooms=Unknown');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.count).toBe(2);
    expect(errors.describeErrors()).toContain('Answer "Hall"');
    expect(errors.describeErrors()).toContain('Answer "Study"');
    expect(errors.describeErrors()).not.toContain('Missing "conclusion="');
  });

  it('does not retain category membership or errors between successive level loads', () => {
    const invalid = loadLevelForTest(overlapText);
    const valid = loadLevelForTest(replacementText);
    const invalidAgain = loadLevelForTest(overlapText);

    expect(invalid.level).toBeNull();
    expect(valid.level).not.toBeNull();
    expect(valid.errors.count).toBe(0);
    expect(invalidAgain.errors.describeErrors()).toBe(invalid.errors.describeErrors());
  });

  it('allows prototype-like answer text without treating inherited properties as owners', () => {
    const text = replacementText.replace('* suspects=Nobody', '* suspects=__proto__|constructor|toString');

    expect(loadValidLevelForTest(text)).not.toBeNull();
  });

  it('loads multiple numbered objects sharing an item title without treating them as authored duplicates', () => {
    const level = loadValidLevelForTest(numberedItemsText);

    expect([...level.itemsById.values()].filter(item => item.title === 'Chair').length).toBeGreaterThan(1);
  });
});