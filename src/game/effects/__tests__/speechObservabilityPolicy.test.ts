import { describe, expect, it } from 'vitest';

import { isThoughtObservable } from '../speechObservabilityPolicy';

describe('isThoughtObservable()', () => {
  it('observes the active character during ordinary play', () => {
    expect(isThoughtObservable(true, false)).toBe(true);
  });

  it('does not observe another character during ordinary play', () => {
    expect(isThoughtObservable(false, false)).toBe(false);
  });

  it('observes another character after level completion', () => {
    expect(isThoughtObservable(false, true)).toBe(true);
  });
});