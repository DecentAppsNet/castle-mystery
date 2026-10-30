import { describe, expect, it } from 'vitest';

import reservedIdsText from './fixtures/reserved-ids.md?raw';
import { loadLevelForTest } from './testLevelUtil';

describe('level loading - reserved IDs', () => {
  it('accepts ordinary character and item IDs', () => {
    const { level, errors } = loadLevelForTest(reservedIdsText);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('rejects a character ID matching the literal at at its heading', () => {
    const text = reservedIdsText.replace('## Alice', '## At');
    const { level, errors } = loadLevelForTest(text, 'reserved-character.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Character ID "at" is a reserved activity word.');
    expect(errors.describeErrors()).toContain(`reserved-character.md:${text.split('\n').indexOf('## At') + 1}:0:`);
  });

  it('rejects an item ID matching the literal to at its heading', () => {
    const text = reservedIdsText.replace('## Vase', '## To');
    const { level, errors } = loadLevelForTest(text, 'reserved-item.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Item ID "to" is a reserved activity word.');
    expect(errors.describeErrors()).toContain(`reserved-item.md:${text.split('\n').indexOf('## To') + 1}:0:`);
  });

  it('rejects a character ID matching the literal to after normalization', () => {
    const text = reservedIdsText.replace('## Alice', '##   TO  ');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Character ID "to" is a reserved activity word.');
    expect(errors.count).toBe(1);
  });

  it('rejects an item ID matching the literal at', () => {
    const text = reservedIdsText.replace('## Vase', '## At');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Item ID "at" is a reserved activity word.');
    expect(errors.count).toBe(1);
  });

  it('rejects an ID matching an activity verb without needing an itinerary reference', () => {
    const text = reservedIdsText.replace('## Vase', '## Waits');
    const { level, errors } = loadLevelForTest(text);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Item ID "waits" is a reserved activity word.');
  });

  it('allows IDs containing a reserved word as only part of the name', () => {
    const text = reservedIdsText.replace('## Vase', '## To Market');
    const { level, errors } = loadLevelForTest(text);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });
});