import { describe, expect, it } from 'vitest';

import defaultLevelText from './fixtures/default-level.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('level loading - waits activities', () => {
  it('converts a decimal wait duration from seconds to milliseconds', () => {
    const text = replaceSection(defaultLevelText, 'itinerary', [
      '0:00:00 Sam waits',
      ': waits .5'
    ]);
    const { level, errors } = loadLevelForTest(text, 'waits-decimal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.endTime).toBe(1_500);
  });
});