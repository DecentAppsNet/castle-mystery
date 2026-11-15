import { describe, expect, it } from 'vitest';
import { getIlluminatedTextSections, splitTextToLines } from '../pageWriterUtil';

describe('pageWriterUtil', () => {
  describe('splitTextToLines()', () => {
    it('keeps an empty line for empty text', () => {
      expect(splitTextToLines('')).toEqual(['']);
    });
    it('normalizes line endings and preserves empty lines', () => {
      expect(splitTextToLines('one\r\ntwo\rthree\n\n')).toEqual(['one', 'two', 'three', '', '']);
    });
  });
  describe('getIlluminatedTextSections()', () => {
    it('returns empty sections for empty text', () => {
      expect(getIlluminatedTextSections('')).toEqual({ firstLetter:'', firstWord:'', theRest:'' });
    });
    it('isolates a single letter', () => {
      expect(getIlluminatedTextSections('a')).toEqual({ firstLetter:'a', firstWord:'', theRest:'' });
    });
    it('uppercases the remainder of a word without following text', () => {
      expect(getIlluminatedTextSections('castle')).toEqual({ firstLetter:'c', firstWord:'ASTLE', theRest:'' });
    });
    it('preserves whitespace and casing after the first word', () => {
      expect(getIlluminatedTextSections('castle  Mystery')).toEqual({
        firstLetter:'c', firstWord:'ASTLE', theRest:'  Mystery'
      });
    });
  });
});