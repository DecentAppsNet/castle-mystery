// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { collapseWhitespace, createNonGlobalRegex, escapeRegexCharacters, findSquareBracketEnclosedTextSegments, findWordLikeTextSegments } from '../regExUtil';

describe('regExUtil', () => {
  describe('findWordLikeTextSegments()', () => {
    it('finds alphanumeric words and apostrophe words with positions', () => {
      expect(findWordLikeTextSegments(`Ted! It's room 206.`)).toEqual([
        { startIndex:0, endIndex:3, enclosedText:'Ted' },
        { startIndex:5, endIndex:9, enclosedText:`It's` },
        { startIndex:10, endIndex:14, enclosedText:'room' },
        { startIndex:15, endIndex:18, enclosedText:'206' }
      ]);
    });

    it('returns an empty array when there are no word-like segments', () => {
      expect(findWordLikeTextSegments(` !!! `)).toEqual([]);
    });
  });
});

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

  describe('collapseWhitespace()', () => {
    it('trims leading and trailing whitespace', () => {
      expect(collapseWhitespace('  hello world  ')).toBe('hello world');
    });

    it('collapses internal whitespace sequences to single spaces', () => {
      expect(collapseWhitespace('hello\t\tthere\nfriend   again')).toBe('hello there friend again');
    });
  });
});