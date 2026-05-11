import { describe, expect, it } from 'vitest';

import { createNonGlobalRegex, escapeRegexCharacters, findSquareBracketEnclosedTextSegments } from '../regExUtil';

describe('regExUtil.ts', () => {
  describe('escapeRegexCharacters()', () => {
    it('escapes regex metacharacters so they can be matched literally', () => {
      expect(escapeRegexCharacters('a+b?c')).toBe('a\\+b\\?c');
    });
  });

  describe('findSquareBracketEnclosedTextSegments()', () => {
    it('returns an empty array when there are no square-bracket segments', () => {
      expect(findSquareBracketEnclosedTextSegments('plain text')).toEqual([]);
    });

    it('finds multiple square-bracket-enclosed segments with indexes', () => {
      expect(findSquareBracketEnclosedTextSegments('[King] met [Queen].')).toEqual([
        { startIndex:0, endIndex:6, enclosedText:'King' },
        { startIndex:11, endIndex:18, enclosedText:'Queen' }
      ]);
    });

    it('preserves separator text between adjacent matches by returning exact end indexes', () => {
      expect(findSquareBracketEnclosedTextSegments('[searched|looked] for [book]')).toEqual([
        { startIndex:0, endIndex:17, enclosedText:'searched|looked' },
        { startIndex:22, endIndex:28, enclosedText:'book' }
      ]);
    });
  });

  describe('createNonGlobalRegex()', () => {
    it('removes the global flag from a regex', () => {
      expect(createNonGlobalRegex(/abc/gi).flags.includes('g')).toBe(false);
      expect(createNonGlobalRegex(/abc/gi).flags.includes('i')).toBe(true);
    });

    it('returns the original regex when it is already non-global', () => {
      const regex = /abc/i;
      expect(createNonGlobalRegex(regex)).toBe(regex);
    });
  });
});