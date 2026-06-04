// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, describe, expect, it, vi } from 'vitest';

import importText from './fixtures/levelImport/import.md?raw';
import levelText from './fixtures/levelImport/level.md?raw';
import recursiveCharactersText from './fixtures/levelImportRecursive/characters.md?raw';
import recursiveItemsText from './fixtures/levelImportRecursive/items.md?raw';
import recursiveSourceText from './fixtures/levelImportRecursive/source.md?raw';
import whitespaceImportText from './fixtures/levelImportWhitespace/import.md?raw';
import whitespaceLevelText from './fixtures/levelImportWhitespace/level.md?raw';
import { createLevelTextWithImportTexts, loadLevelTextWithImports } from '../levelImportUtil';

describe('levelImportUtil', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('merges matching sections recursively and keeps level values for duplicate keys', () => {
    const mergedText = createLevelTextWithImportTexts([importText], levelText);

    expect(mergedText).toContain('# general');
    expect(mergedText).toContain('* title=Level Title');
    expect(mergedText).toContain('* background=import.png');
    expect(mergedText).toContain('# colors');
    expect(mergedText).toContain('## orange');
    expect(mergedText).toContain('* description=level orange color');
    expect(mergedText).toContain('# fruit');
    expect(mergedText).toContain('* description=import orange fruit');
    expect(mergedText).toContain('# characters');
    expect(mergedText).toContain('* description=Level Simon');
    expect(mergedText).toContain('* faceImage=importFace.png');
    expect(mergedText).toContain('## Queen');
    expect(mergedText).toContain('# items');
    expect(mergedText).toContain('* description=Level Box');
    expect(mergedText).toContain('## Capybara');
    expect(mergedText).toContain('* description=Capybara only');
  });

  it('keeps authored prose when both versions describe the same section in plain text', () => {
    const importText = '# notes\n\nImported note.\n';
    const levelText = '# notes\n\nLevel note.\n';

    const mergedText = createLevelTextWithImportTexts([importText], levelText);

    expect(mergedText).toContain('# notes');
    expect(mergedText).toContain('Level note.');
    expect(mergedText).not.toContain('Imported note.');
  });

  it('accepts leading whitespace before markdown headings when merging imports', () => {
    const mergedText = createLevelTextWithImportTexts([whitespaceImportText], whitespaceLevelText);

    expect(mergedText).toContain('# general');
    expect(mergedText).toContain('* title=Level Title');
    expect(mergedText).toContain('* background=import.png');
    expect(mergedText).toContain('## orange');
    expect(mergedText).toContain('* description=level orange color');
  });

  it('returns the source text unchanged when a level has no imports', async () => {
    const fetchMock = vi.fn(async (url:string) => {
      if (url.endsWith('/levels/level.md')) {
        return {
          ok:true,
          text:async () => levelText
        };
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const loadedText = await loadLevelTextWithImports('level.md');

    expect(loadedText).toBe(levelText);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('loads nested imports recursively before merging them into the source level text', async () => {
    const fetchMock = vi.fn(async (url:string) => {
      if (url.endsWith('/levels/source.md')) {
        return {
          ok:true,
          text:async () => recursiveSourceText
        };
      }
      if (url.endsWith('/levels/characters.md')) {
        return {
          ok:true,
          text:async () => recursiveCharactersText
        };
      }
      if (url.endsWith('/levels/items.md')) {
        return {
          ok:true,
          text:async () => recursiveItemsText
        };
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const loadedText = await loadLevelTextWithImports('source.md');

    expect(loadedText).toContain('* title=Village');
    expect(loadedText).toContain('* description=Source Simon');
    expect(loadedText).toContain('* faceImage=importFace.png');
    expect(loadedText).toContain('## Queen');
    expect(loadedText).toContain('## Side Table');
    expect(loadedText).toContain('* description=Nested item import');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects import entries that are paths or urls', async () => {
    const fetchMock = vi.fn(async (url:string) => {
      if (url.endsWith('/levels/source.md')) {
        return {
          ok:true,
          text:async () => '# general\n\n* imports=../items.md\n'
        };
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    await expect(loadLevelTextWithImports('source.md')).rejects.toThrow('general imports entries must be a filename, not a path or URL');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
