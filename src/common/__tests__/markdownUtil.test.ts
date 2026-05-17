import { describe, expect, it } from 'vitest';

import { normalizeMarkdownName, parseNameValueLines, parseSections } from '../markdownUtil';

describe('markdownUtil', () => {
  describe('normalizeMarkdownName()', () => {
    it('normalizes mixed-case whitespace-separated names to camelCase', () => {
      expect(normalizeMarkdownName('  WIN synopsis  ')).toBe('winSynopsis');
    });

    it('preserves existing camelCase names', () => {
      expect(normalizeMarkdownName('winSynopsis')).toBe('winSynopsis');
    });
  });

  describe('parseSections()', () => {
    it('parses headings with leading whitespace and normalizes names when requested', () => {
      const sections = parseSections([
        '  # General',
        '* activeCharacter=Hero',
        '',
        '\t# SOLUTIONS',
        '## First'
      ].join('\n'), 1, true);

      expect(Object.keys(sections)).toEqual(['general', 'solutions']);
      expect(sections.general).toContain('* activeCharacter=Hero');
    });

    it('preserves subsection ids when name normalization is not requested', () => {
      const sections = parseSections([
        '## East Hall',
        '* title=East Hall'
      ].join('\n'), 2);

      expect(Object.keys(sections)).toEqual(['East Hall']);
    });
  });

  describe('parseNameValueLines()', () => {
    it('accepts forgiving whitespace around bullets and equals signs', () => {
      const nameValues = parseNameValueLines([
        '  *   title = Library',
        '*description=Quiet\\nRoom'
      ].join('\n'));

      expect(nameValues).toEqual({ title:'Library', description:'Quiet\nRoom' });
    });

    it('normalizes property names when requested', () => {
      const nameValues = parseNameValueLines([
        '* Active Character = Hero',
        '* WIN SYNOPSIS = Solved.'
      ].join('\n'), true);

      expect(nameValues).toEqual({ activeCharacter:'Hero', winSynopsis:'Solved.' });
    });

    it('preserves authored legend keys by default', () => {
      const nameValues = parseNameValueLines('* E = East Hall');

      expect(nameValues).toEqual({ E:'East Hall' });
    });
  });
});