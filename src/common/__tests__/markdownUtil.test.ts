import { describe, expect, it } from 'vitest';

import {
  normalizeMarkdownName,
  parseFirstFencedCodeBlockLines,
  parseNameValueLineEntries,
  parseOptions,
  parseSectionEntries,
  parseSections,
  parseUniqueNameValueLines
} from '../markdownUtil';

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

    it('throws on duplicate exact headings', () => {
      expect(() => parseSections([
        '## Hero',
        '* description=First',
        '## Hero',
        '* description=Second'
      ].join('\n'), 2)).toThrow(`duplicate section 'Hero'`);
    });

    it('throws on duplicate normalized headings when requested', () => {
      expect(() => parseSections([
        '# General',
        '* activeCharacter=Hero',
        '# GENERAL',
        '* activeCharacter=Guide'
      ].join('\n'), 1, true)).toThrow(`duplicate section 'general'`);
    });
  });

  describe('parseSectionEntries()', () => {
    it('preserves section order and content without collapsing entries into an object', () => {
      const entries = parseSectionEntries([
        '## East Hall',
        '* title=East Hall',
        '## West Hall',
        '* title=West Hall'
      ].join('\n'), 2);

      expect(entries).toEqual([
        ['East Hall', '* title=East Hall'],
        ['West Hall', '* title=West Hall']
      ]);
    });

    it('normalizes heading names when requested', () => {
      const entries = parseSectionEntries([
        '# General',
        '* activeCharacter=Hero',
        '# WIN SYNOPSIS',
        '* ignored=true'
      ].join('\n'), 1, true);

      expect(entries.map(([name]) => name)).toEqual(['general', 'winSynopsis']);
    });
  });

  describe('parseUniqueNameValueLines()', () => {
    it('accepts forgiving whitespace around bullets and equals signs', () => {
      const nameValues = parseUniqueNameValueLines([
        '  *   title = Library',
        '*description=Quiet\\nRoom'
      ].join('\n'), 'room');

      expect(nameValues).toEqual({ title:'Library', description:'Quiet\nRoom' });
    });

    it('normalizes property names when requested', () => {
      const nameValues = parseUniqueNameValueLines([
        '* Active Character = Hero',
        '* WIN SYNOPSIS = Solved.'
      ].join('\n'), 'general', true);

      expect(nameValues).toEqual({ activeCharacter:'Hero', winSynopsis:'Solved.' });
    });

    it('preserves authored legend keys by default', () => {
      const nameValues = parseUniqueNameValueLines('* E = East Hall', 'map legend');

      expect(nameValues).toEqual({ E:'East Hall' });
    });

    it('throws on duplicate entries', () => {
      expect(() => parseUniqueNameValueLines([
        '* title=Library',
        '* title=Study'
      ].join('\n'), 'room')).toThrow(`duplicate room entry 'title'`);
    });
  });

  describe('parseNameValueLineEntries()', () => {
    it('preserves authored key order and duplicate entries', () => {
      const entries = parseNameValueLineEntries([
        '* title=Library',
        '* title=Study',
        '* description=Quiet'
      ].join('\n'));

      expect(entries).toEqual([
        ['title', 'Library'],
        ['title', 'Study'],
        ['description', 'Quiet']
      ]);
    });

    it('normalizes property names when requested', () => {
      const entries = parseNameValueLineEntries([
        '* Active Character = Hero',
        '* WIN SYNOPSIS = Solved.'
      ].join('\n'), true);

      expect(entries).toEqual([
        ['activeCharacter', 'Hero'],
        ['winSynopsis', 'Solved.']
      ]);
    });
  });

  describe('parseOptions()', () => {
    it('trims option text and removes empty options', () => {
      expect(parseOptions(' Book | | Crown |  ')).toEqual(['Book', 'Crown']);
    });
  });

  describe('parseFirstFencedCodeBlockLines()', () => {
    it('returns only the first fenced block and skips blank lines inside it', () => {
      const lines = parseFirstFencedCodeBlockLines([
        '* title=Hall',
        '```',
        'AB',
        '',
        'CD',
        '```',
        '```',
        'EF',
        '```'
      ].join('\n'));

      expect(lines).toEqual(['AB', 'CD']);
    });
  });
});