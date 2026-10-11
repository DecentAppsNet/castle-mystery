import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLevelFromUrl } from '..';
import sourceText from './fixtures/initial-appearance-import.md?raw';
import importedCharactersText from './fixtures/initial-appearance-characters.md?raw';

function _mockLevelFetch(charactersText:string) {
  vi.stubGlobal('window', { location:{ pathname:'/' } });
  vi.stubGlobal('fetch', vi.fn(async (url:string) => {
    if (url.endsWith('/levels/initial-appearance-import.md')) return { ok:true, text:async () => sourceText };
    if (url.endsWith('/levels/initial-appearance-characters.md')) return { ok:true, text:async () => charactersText };
    throw new Error(`Unexpected URL ${url}`);
  }));
}

describe('level loading - imported initial appearances', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('resolves imported and local skin headings through the same loading path', async () => {
    _mockLevelFetch(importedCharactersText);
    const { level, errors } = await loadLevelFromUrl('initial-appearance-import.md');
    expect(errors.describeErrors()).toBe('');
    expect(level?.characters.find(character => character.id === 'sam')?.skinId).toBe('sam-night guard');
    expect(level?.characters.find(character => character.id === 'alex')?.skinId).toBe('alex-guard');
    const characterI = level!.timeline.characterIdToI.sam;
    expect(level?.timeline.keyframes[0].characters[characterI].skinId).toBe('sam-night guard');
  });

  it('locates unknown imported initial references in their original source file', async () => {
    _mockLevelFetch(importedCharactersText.replace('* appearsAs= Night Guard ', '* appearsAs=Missing'));
    const { level, errors } = await loadLevelFromUrl('initial-appearance-import.md');
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('initial-appearance-characters.md:3:');
    expect(errors.describeErrors()).toContain('Unknown initial appearance "Missing"');
  });

  it('rejects empty imported initial references at their original source line', async () => {
    _mockLevelFetch(importedCharactersText.replace('* appearsAs= Night Guard ', '* appearsAs='));
    const { level, errors } = await loadLevelFromUrl('initial-appearance-import.md');
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('initial-appearance-characters.md:3:');
    expect(errors.describeErrors()).toContain('Unknown initial appearance ""');
  });
});