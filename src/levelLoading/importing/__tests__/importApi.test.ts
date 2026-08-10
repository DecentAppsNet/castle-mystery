// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, describe, expect, it, vi } from 'vitest';

import levelText from './fixtures/levelImport/level.md?raw';
import dedupAText from './fixtures/levelImportDedup/a.md?raw';
import dedupBText from './fixtures/levelImportDedup/b.md?raw';
import dedupCText from './fixtures/levelImportDedup/c.md?raw';
import recursiveCharactersText from './fixtures/levelImportRecursive/characters.md?raw';
import recursiveItemsText from './fixtures/levelImportRecursive/items.md?raw';
import recursiveSourceText from './fixtures/levelImportRecursive/source.md?raw';
import cycleAText from './fixtures/levelImportCycle/a.md?raw';
import cycleBText from './fixtures/levelImportCycle/b.md?raw';
import selfImportAText from './fixtures/levelImportSelf/a.md?raw';
import { loadLevelWithImportsAndSourceLineMap } from '../importSourceLoader.ts';

function _findMergedLineNo(text:string, needle:string):number {
  const lineIndex = text.split('\n').findIndex(line => line === needle);
  expect(lineIndex).toBeGreaterThanOrEqual(0);
  return lineIndex + 1;
}

function _countExactLineOccurrences(text:string, needle:string):number {
  return text.split('\n').filter(line => line === needle).length;
}

describe('importApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

    const loadedText = (await loadLevelWithImportsAndSourceLineMap('level.md')).text;

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

    const loaded = await loadLevelWithImportsAndSourceLineMap('level.md');

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

    const loadedText = (await loadLevelWithImportsAndSourceLineMap('source.md')).text;

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

    const loaded = await loadLevelWithImportsAndSourceLineMap('source.md');
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

    await expect(loadLevelWithImportsAndSourceLineMap('source.md')).rejects.toThrow('general imports entries must be a filename, not a path or URL');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates transitive imports so the same file is merged only once', async () => {
    const fetchMock = vi.fn(async (url:string) => {
      if (url.endsWith('/levels/a.md')) return { ok:true, text:async () => dedupAText };
      if (url.endsWith('/levels/b.md')) return { ok:true, text:async () => dedupBText };
      if (url.endsWith('/levels/c.md')) return { ok:true, text:async () => dedupCText };
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const loadedText = (await loadLevelWithImportsAndSourceLineMap('a.md')).text;

    expect(_countExactLineOccurrences(loadedText, '## Shared Book')).toBe(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/levels/c.md'))).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it(`rejects a level file that imports itself`, async () => {
    const fetchMock = vi.fn(async (url:string) => {
      if (url.endsWith('/levels/a.md')) {
        if (fetchMock.mock.calls.length > 3) throw new Error('self import recursion guard');
        return { ok:true, text:async () => selfImportAText };
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    await expect(loadLevelWithImportsAndSourceLineMap('a.md')).rejects.toThrow(`A level file can't import itself.`);
  });

  it('deduplicates cyclic imports when a transitive import points back to the root level', async () => {
    const fetchMock = vi.fn(async (url:string) => {
      if (url.endsWith('/levels/a.md')) {
        if (fetchMock.mock.calls.filter(([calledUrl]) => String(calledUrl).endsWith('/levels/a.md')).length > 1) {
          throw new Error('cycle recursion guard');
        }
        return { ok:true, text:async () => cycleAText };
      }
      if (url.endsWith('/levels/b.md')) return { ok:true, text:async () => cycleBText };
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const loadedText = (await loadLevelWithImportsAndSourceLineMap('a.md')).text;

    expect(loadedText).toContain('* description=Hero from A');
    expect(loadedText).toContain('* description=Imported from B');
    expect(_countExactLineOccurrences(loadedText, '## Hero')).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
