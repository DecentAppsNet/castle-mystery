import { describe, expect, it } from 'vitest';

import { isSpeechAudible, isThoughtObservable } from '../speechObservabilityPolicy';

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

describe('isSpeechAudible()', () => {
  it('is audible during ordinary play in a clear active room', () => {
    expect(isSpeechAudible(false, false)).toBe(true);
  });

  it('is not audible during ordinary play in an obscured active room', () => {
    expect(isSpeechAudible(true, false)).toBe(false);
  });

  it('is audible after level completion despite active-room obscurity', () => {
    expect(isSpeechAudible(true, true)).toBe(true);
  });
});