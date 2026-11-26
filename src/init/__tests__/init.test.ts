import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initApp } from '../init';

const { initAppMetaData, setText, initLevelChanges } = vi.hoisted(() => ({
  initAppMetaData:vi.fn<() => Promise<void>>(),
  setText:vi.fn<(key:string, text:string) => Promise<void>>(),
  initLevelChanges:vi.fn<() => Promise<void>>()
}));

vi.mock('decent-portal', () => ({ getAppId:() => 'test-app', initAppMetaData }));
vi.mock('@/persistence/pathStore', () => ({ setText }));
vi.mock('@/persistence/levelChangeQueue', () => ({ initLevelChanges }));
vi.mock('@/developer/debugUtil', () => ({ initCastleDebug:vi.fn() }));
vi.mock('@/developer/devEnvUtil', () => ({ isServingLocally:() => false }));

const body = { textContent:'' };
const loadFont = vi.fn<() => Promise<void>>();

function _mockLocks(granted:boolean = true) {
  const released = vi.fn();
  const request = vi.fn(async (_name:string, _options:LockOptions, callback:LockGrantedCallback<unknown>) => {
    try {
      return await callback(granted ? { name:'test-app:storage', mode:'exclusive' } : null);
    } finally {
      if (granted) released();
    }
  });
  vi.stubGlobal('navigator', { locks:{ request } });
  return { request, released };
}

describe('initApp()', () => {
  beforeEach(() => {
    body.textContent = '';
    initAppMetaData.mockReset().mockResolvedValue(undefined);
    setText.mockReset().mockResolvedValue(undefined);
    initLevelChanges.mockReset().mockResolvedValue(undefined);
    loadFont.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal('document', { body, fonts:{ load:loadFont } });
    vi.stubGlobal('HTMLCanvasElement', class {});
    vi.stubGlobal('createImageBitmap', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('refuses startup and logs each missing API', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', undefined);
    await expect(initApp()).resolves.toBe(false);
    expect(body.textContent).toContain("Castle Mystery can't run on your browser");
    expect(logError.mock.calls).toEqual([
      ['Required API fetch() was unavailable.'],
      ['Required API navigator.locks.request() was unavailable.']
    ]);
    expect(setText).not.toHaveBeenCalled();
    expect(initLevelChanges).not.toHaveBeenCalled();
  });

  it('refuses startup without touching storage when another tab holds the lock', async () => {
    const { request } = _mockLocks(false);
    await expect(initApp()).resolves.toBe(false);
    expect(request).toHaveBeenCalledExactlyOnceWith('test-app:storage', { mode:'exclusive', ifAvailable:true }, expect.any(Function));
    expect(body.textContent).toContain('another tab');
    expect(setText).not.toHaveBeenCalled();
    expect(initLevelChanges).not.toHaveBeenCalled();
  });

  it('releases ownership and refuses startup when the storage write fails', async () => {
    const { released } = _mockLocks();
    setText.mockRejectedValueOnce(new Error('Transaction aborted'));
    await expect(initApp()).resolves.toBe(false);
    expect(body.textContent).toContain('IndexedDB storage');
    expect(body.textContent).toContain('Transaction aborted');
    expect(initLevelChanges).not.toHaveBeenCalled();
    expect(released).toHaveBeenCalledOnce();
  });

  it('releases ownership if queue initialization fails', async () => {
    const { released } = _mockLocks();
    initLevelChanges.mockRejectedValueOnce(new Error('Read failed'));
    await expect(initApp()).resolves.toBe(false);
    expect(body.textContent).toContain('Read failed');
    expect(released).toHaveBeenCalledOnce();
  });

  it('waits for the write and queue initialization, then keeps ownership after startup returns', async () => {
    const { request, released } = _mockLocks();
    const write = Promise.withResolvers<void>();
    const queue = Promise.withResolvers<void>();
    setText.mockReturnValueOnce(write.promise);
    initLevelChanges.mockReturnValueOnce(queue.promise);
    const ready = vi.fn();
    const startup = initApp().then(ready);
    await vi.waitFor(() => expect(setText).toHaveBeenCalledOnce());
    expect(initAppMetaData).toHaveBeenCalledBefore(request);
    expect(request).toHaveBeenCalledBefore(setText);
    expect(initLevelChanges).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();

    write.resolve();
    await vi.waitFor(() => expect(initLevelChanges).toHaveBeenCalledOnce());
    expect(ready).not.toHaveBeenCalled();
    queue.resolve();
    await startup;
    expect(ready).toHaveBeenCalledExactlyOnceWith(true);
    expect(released).not.toHaveBeenCalled();
  });
});