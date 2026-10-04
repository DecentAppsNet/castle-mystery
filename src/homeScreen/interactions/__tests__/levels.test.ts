import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initCastleDebug } from '@/developer/debugUtil';
import levelText from '@/levelLoading/__tests__/fixtures/default-level.md?raw';
import { setLastLevelUrl } from '@/persistence/lastLevel';
import { changeLevel, continueToNextLevel } from '../levels';

vi.mock('@/persistence/lastLevel', () => ({ setLastLevelUrl:vi.fn(async () => {}) }));

type ChangeLevelParams = Parameters<typeof changeLevel>[0];

function _createRequest() {
  let finishClosing!:(isClosed:boolean) => void;
  const closed = new Promise<boolean>(resolve => { finishClosing = resolve; });
  const params:ChangeLevelParams = {
    levelUrl:'first.md',
    levelManifest:{ levelUrls:['first.md', 'second.md'], levelTitles:['First', 'Second'], lastLevelI:0 },
    loadRequest:{ pending:null, isMounted:true },
    closeCurtain:vi.fn(() => closed),
    onLoadingFailed:vi.fn(),
    setGameState:vi.fn(), setLevelManifest:vi.fn(), setIsPlaying:vi.fn(), setMinutes:vi.fn(),
    setWinSynopsis:vi.fn(), setConclusions:vi.fn(), setDiscoveries:vi.fn(),
    setConclusionClaimCooldowns:vi.fn(), setActiveCharacterId:vi.fn(), setModalDialogName:vi.fn()
  };
  return { finishClosing, params };
}

describe('levels', () => {
  beforeEach(() => {
    initCastleDebug();
    vi.clearAllMocks();
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });
    vi.stubGlobal('fetch', vi.fn(async (url:string) => url.endsWith('.md')
      ? new Response(levelText) : new Response(new Blob(), { headers:{ 'content-type':'image/png' } })));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width:1, height:1 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('changeLevel()', () => {
    it('waits for the close operation before fetching or applying replacement data', async () => {
      const { finishClosing, params } = _createRequest();
      const pending = changeLevel(params);
      await Promise.resolve();
      expect(params.closeCurtain).toHaveBeenCalledOnce();
      expect(fetch).not.toHaveBeenCalled();
      expect(params.setGameState).not.toHaveBeenCalled();
      finishClosing(true);
      await pending;
      expect(fetch).toHaveBeenCalledWith('/castle-mystery/levels/first.md');
      expect(params.setGameState).toHaveBeenCalledOnce();
      expect(params.setIsPlaying).toHaveBeenCalledWith(false);
      expect(params.setConclusionClaimCooldowns).toHaveBeenCalledWith({});
      expect(setLastLevelUrl).toHaveBeenCalledExactlyOnceWith('first.md');
      expect(params.onLoadingFailed).not.toHaveBeenCalled();
      expect(params.loadRequest.pending).toBeNull();
    });

    it('reuses the active request and ignores another selected level', async () => {
      const { finishClosing, params } = _createRequest();
      const pending = changeLevel(params);
      expect(changeLevel({ ...params, levelUrl:'second.md' })).toBe(pending);
      await Promise.resolve();
      finishClosing(true);
      await pending;
      expect(params.closeCurtain).toHaveBeenCalledOnce();
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/levels/second.md');
      expect(params.setGameState).toHaveBeenCalledOnce();
    });

    it('reports a load failure and settles the request without replacing the old data', async () => {
      const { finishClosing, params } = _createRequest();
      vi.mocked(fetch).mockRejectedValue(new Error('Network unavailable'));
      const pending = changeLevel(params);
      await Promise.resolve();
      finishClosing(true);
      await expect(pending).resolves.toBeUndefined();
      expect(params.onLoadingFailed).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalled();
      expect(params.setGameState).not.toHaveBeenCalled();
      expect(setLastLevelUrl).not.toHaveBeenCalled();
      expect(params.loadRequest.pending).toBeNull();
    });

    it('does not fetch when the close operation is cancelled', async () => {
      const { finishClosing, params } = _createRequest();
      const pending = changeLevel(params);
      await Promise.resolve();
      finishClosing(false);
      await pending;
      expect(fetch).not.toHaveBeenCalled();
      expect(params.setGameState).not.toHaveBeenCalled();
      expect(params.loadRequest.pending).toBeNull();
    });

    it('does not apply a level whose loading finishes after unmount', async () => {
      const { finishClosing, params } = _createRequest();
      let finishFetch!:(response:Response) => void;
      vi.mocked(fetch).mockImplementation(() => new Promise<Response>(resolve => { finishFetch = resolve; }));
      const pending = changeLevel(params);
      await Promise.resolve();
      finishClosing(true);
      await Promise.resolve();
      expect(fetch).toHaveBeenCalledOnce();
      params.loadRequest.isMounted = false;
      vi.mocked(fetch).mockResolvedValue(new Response(new Blob()));
      finishFetch(new Response(levelText));
      await pending;
      expect(params.setGameState).not.toHaveBeenCalled();
      expect(params.onLoadingFailed).not.toHaveBeenCalled();
      expect(setLastLevelUrl).not.toHaveBeenCalled();
    });
  });

  describe('continueToNextLevel()', () => {
    it('loads the next manifest entry through the same close-before-load path', async () => {
      const { finishClosing, params } = _createRequest();
      const pending = continueToNextLevel(params);
      await Promise.resolve();
      expect(fetch).not.toHaveBeenCalled();
      finishClosing(true);
      await pending;
      expect(fetch).toHaveBeenCalledWith('/castle-mystery/levels/second.md');
      expect(params.setLevelManifest).toHaveBeenCalledWith({ ...params.levelManifest, lastLevelI:1 });
      expect(setLastLevelUrl).toHaveBeenCalledWith('second.md');
    });

    it('dismisses the dialog without closing or loading when there is no next entry', async () => {
      const { params } = _createRequest();
      await continueToNextLevel({ ...params, levelManifest:{ ...params.levelManifest, lastLevelI:1 } });
      expect(params.setModalDialogName).toHaveBeenCalledExactlyOnceWith(null);
      expect(params.closeCurtain).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(params.loadRequest.pending).toBeNull();
    });
  });
});