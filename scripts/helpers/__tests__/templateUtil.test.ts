import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';

import { fillPromptTemplate, findPromptParameters, findTemplate, loadTemplates } from '../templateUtil.ts';

function _setReadFileText(fileText:string):void {
  vi.mocked(readFile).mockResolvedValue(fileText);
}

describe('templateUtil', () => {
  describe('fillPromptTemplate()', () => {
    it('replaces required fields outside optional blocks', () => {
      expect(fillPromptTemplate('Hello [name].', { name:'Barney' })).toBe('Hello Barney.');
    });

    it('omits an optional block when one of its fields is missing', () => {
      expect(fillPromptTemplate('Generate a ferret{ named [name]}.', {})).toBe('Generate a ferret.');
    });

    it('includes an optional block when all of its direct fields are present', () => {
      expect(fillPromptTemplate('Generate a ferret{ named [name]}.', { name:'Barney' })).toBe('Generate a ferret named Barney.');
    });

    it('allows nested optional blocks to be omitted independently', () => {
      expect(fillPromptTemplate('A hero{ named [name]{ with a [weapon]}} appears.', { name:'Barney' })).toBe('A hero named Barney appears.');
    });

    it('includes nested optional blocks when their fields are present', () => {
      expect(fillPromptTemplate('A hero{ named [name]{ with a [weapon]}} appears.', { name:'Barney', weapon:'sword' })).toBe('A hero named Barney with a sword appears.');
    });

    it('throws when a required field outside optional blocks is missing', () => {
      expect(() => fillPromptTemplate('Hello [name].', {})).toThrow("Missing template field 'name'.");
    });
  });

  describe('findPromptParameters()', () => {
    it('returns prompt parameters in first-appearance order with optional flags', () => {
      expect(findPromptParameters('A [hero]{ from [town]} meets [villain]{ using [weapon]}.')).toEqual([
        { name:'hero', isOptional:false },
        { name:'town', isOptional:true },
        { name:'villain', isOptional:false },
        { name:'weapon', isOptional:true }
      ]);
    });

    it('marks a parameter as required if it appears anywhere outside optional blocks', () => {
      expect(findPromptParameters('{[name]} and [name].')).toEqual([
        { name:'name', isOptional:false }
      ]);
    });
  });

  describe('findTemplate()', () => {
    it('returns the named template', () => {
      const template = findTemplate('pet', {
        pet:{
          name:'pet',
          promptText:'Generate [animal].',
          size:'1024x1024',
          imageFilePaths:[]
        }
      });

      expect(template.size).toBe('1024x1024');
    });

    it('throws for an unknown template name', () => {
      expect(() => findTemplate('missing', {})).toThrow("Unknown template 'missing'.");
    });
  });

  describe('loadTemplates()', () => {
    it('loads templates and resolves optional image references', async () => {
      _setReadFileText(`# templates\n\n## pet\n\n* prompt=Generate [animal].\n* size=1024x1024\n* image1=tintin.png\n* image3=pose.png\n`);

      const templates = await loadTemplates();

      expect(templates.pet).toEqual({
        name:'pet',
        promptText:'Generate [animal].',
        size:'1024x1024',
        imageFilePaths:[
          expect.stringContaining('/scripts/templateImages/tintin.png'),
          expect.stringContaining('/scripts/templateImages/pose.png')
        ]
      });
    });
  });
});