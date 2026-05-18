// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as lastLevel from '@/persistence/lastLevel';
import { loadLevelManifestFromUrl } from '../manifestUtil';

describe('manifestUtil', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads level URLs from the manifest and titles from each level general section', async () => {
    vi.spyOn(lastLevel, 'getLastLevelUrl').mockResolvedValue(null);

    const fetchMock = vi.fn(async (url:string) => {
      if (url.endsWith('/levels/levels.md')) {
        return {
          ok:true,
          text:async () => '# levels\n\n* doors.md\n* missingBook.md\n'
        };
      }
      if (url.endsWith('/levels/doors.md')) {
        return {
          ok:true,
          text:async () => '# general\n\n* title=Doors\n'
        };
      }
      if (url.endsWith('/levels/missingBook.md')) {
        return {
          ok:true,
          text:async () => '# general\n\n* title=Missing Book\n'
        };
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    const manifest = await loadLevelManifestFromUrl('/levels/levels.md');

    expect(manifest.levelUrls).toEqual(['/levels/doors.md', '/levels/missingBook.md']);
    expect(manifest.levelTitles).toEqual(['Doors', 'Missing Book']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws when a listed level is missing a title in its general section', async () => {
    vi.spyOn(lastLevel, 'getLastLevelUrl').mockResolvedValue(null);

    const fetchMock = vi.fn(async (url:string) => {
      if (url.endsWith('/levels/levels.md')) {
        return {
          ok:true,
          text:async () => '# levels\n\n* doors.md\n'
        };
      }
      if (url.endsWith('/levels/doors.md')) {
        return {
          ok:true,
          text:async () => '# general\n\n* time=0:00\n'
        };
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });

    await expect(loadLevelManifestFromUrl('/levels/levels.md')).rejects.toThrow("missing general title");
  });
});