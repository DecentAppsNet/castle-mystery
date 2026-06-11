// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, describe, expect, it, vi } from 'vitest';

import importText from './fixtures/levelImport/import.md?raw';
import levelText from './fixtures/levelImport/level.md?raw';
import recursiveCharactersText from './fixtures/levelImportRecursive/characters.md?raw';
import recursiveItemsText from './fixtures/levelImportRecursive/items.md?raw';
import recursiveSourceText from './fixtures/levelImportRecursive/source.md?raw';
import whitespaceImportText from './fixtures/levelImportWhitespace/import.md?raw';
import whitespaceLevelText from './fixtures/levelImportWhitespace/level.md?raw';
import { createLevelTextWithImportTexts, createLevelTextWithImportTextsAndSourceLineMap, loadLevelTextWithImports, loadLevelTextWithSourceLineMap } from '../levelImportUtil';

function _findMergedLineNo(text:string, needle:string):number {
  const lineIndex = text.split('\n').findIndex(line => line === needle);
  expect(lineIndex).toBeGreaterThanOrEqual(0);
  return lineIndex + 1;
}

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

  it('builds a SourceLineMap for merged lines from both level and import files', () => {
    const merged = createLevelTextWithImportTextsAndSourceLineMap(
      [{ filename:'import.md', text:importText }],
      { filename:'level.md', text:levelText }
    );

    const titleLineNo = _findMergedLineNo(merged.text, '* title=Level Title');
    const backgroundLineNo = _findMergedLineNo(merged.text, '* background=import.png');
    const faceImageLineNo = _findMergedLineNo(merged.text, '* faceImage=importFace.png');

    expect(merged.sourceLineMap[titleLineNo - 1]).toEqual({ filename:'level.md', lineNo:3 });
    expect(merged.sourceLineMap[backgroundLineNo - 1]).toEqual({ filename:'import.md', lineNo:4 });
    expect(merged.sourceLineMap[faceImageLineNo - 1]).toEqual({ filename:'import.md', lineNo:23 });
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

  it('returns an identity SourceLineMap when a level has no imports', async () => {
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

    const loaded = await loadLevelTextWithSourceLineMap('level.md');

    expect(loaded.text).toBe(levelText);
    expect(loaded.sourceLineMap[0]).toEqual({ filename:'level.md', lineNo:1 });
    expect(loaded.sourceLineMap[loaded.sourceLineMap.length - 1]).toEqual({ filename:'level.md', lineNo:levelText.split('\n').length });
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

  it('preserves nested import provenance in the SourceLineMap', async () => {
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

    const loaded = await loadLevelTextWithSourceLineMap('source.md');
    const nestedItemLineNo = _findMergedLineNo(loaded.text, '* description=Nested item import');
    const faceImageLineNo = _findMergedLineNo(loaded.text, '* faceImage=importFace.png');
    const sourceDescriptionLineNo = _findMergedLineNo(loaded.text, '* description=Source Simon');

    expect(loaded.sourceLineMap[sourceDescriptionLineNo - 1]).toEqual({ filename:'source.md', lineNo:10 });
    expect(loaded.sourceLineMap[faceImageLineNo - 1]).toEqual({ filename:'characters.md', lineNo:9 });
    expect(loaded.sourceLineMap[nestedItemLineNo - 1]).toEqual({ filename:'items.md', lineNo:5 });
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
