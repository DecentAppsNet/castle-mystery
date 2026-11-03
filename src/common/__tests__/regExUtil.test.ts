// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { collapseWhitespace, createNonGlobalRegex, escapeRegexCharacters, findSquareBracketEnclosedTextSegments, isAsciiDigitSequence } from '../regExUtil';

describe('regExUtil.ts', () => {
  describe('isAsciiDigitSequence()', () => {
    it('accepts digits including zero and leading zeros', () => {
      expect(isAsciiDigitSequence('00123456789')).toBe(true);
    });

    it('rejects empty text', () => {
      expect(isAsciiDigitSequence('')).toBe(false);
    });

    it('rejects non-ASCII digits', () => {
      expect(isAsciiDigitSequence('\u0661')).toBe(false);
    });

    it('rejects non-digit characters', () => {
      expect(isAsciiDigitSequence('12a')).toBe(false);
    });

    it('rejects a trailing newline', () => {
      expect(isAsciiDigitSequence('12\n')).toBe(false);
    });
  });

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

  describe('collapseWhitespace()', () => {
    it('trims leading and trailing whitespace', () => {
      expect(collapseWhitespace('  hello world  ')).toBe('hello world');
    });

    it('collapses internal whitespace sequences to single spaces', () => {
      expect(collapseWhitespace('hello\t\tthere\nfriend   again')).toBe('hello there friend again');
    });
  });
});