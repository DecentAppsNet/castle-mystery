/* This module prepares app-wide prerequisites before the first render.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { setSeed } from "@/common/randUtil";
import { initCastleDebug } from "@/developer/debugUtil";
import { isServingLocally } from "@/developer/devEnvUtil";
import { initLevelChanges } from "@/persistence/levelChangeQueue";
import { setText } from "@/persistence/pathStore";
import { getAppId, initAppMetaData } from "decent-portal";

function _showFatalErrorMessage(message:string) {
  const body = globalThis.document?.body;
  if (body) body.textContent = `Fatal Error: ${message}`;
}

function _initLocalDeveloperTools():void {
  setSeed(0); // Repeatable p-random #s while developing helps with troubleshooting.
  initCastleDebug();
}

async function _preloadFonts():Promise<void> {
 await document.fonts.load('1rem im-fell-english');
}

// We will check for required browser APIs one time and one time only - right here. The exception would be if fallback behavior
// will be implemented, in which case, it may make sense to do API checks later in the code.
function _areRequiredBrowserApisSupported():boolean {
  const supportByApi = {
    'fetch()':typeof fetch === 'function',
    'createImageBitmap()':typeof createImageBitmap === 'function',
    document:typeof document !== 'undefined',
    HTMLCanvasElement:typeof HTMLCanvasElement !== 'undefined',
    'navigator.locks.request()':typeof globalThis.navigator?.locks?.request === 'function'
  };
  const missingApis = Object.keys(supportByApi).filter(api => !supportByApi[api as keyof typeof supportByApi]);
  missingApis.forEach(api => console.error(`Required API ${api} was unavailable.`));
  return missingApis.length === 0;
}

async function _initializeWithStorageLock(locks:LockManager):Promise<void> {
  return new Promise<void>((ready, reject) => {
    void locks.request(`${getAppId()}:storage`, { mode:'exclusive', ifAvailable:true }, async lock => {
      if (!lock) throw new Error('Castle Mystery is already open in another tab. Close that tab and reload.');

      try {
        await setText('/startup/storageProbe', String(Date.now()));
        await initLevelChanges();
      } catch (error) {
        throw new Error(`Castle Mystery could not initialize IndexedDB storage: ${String(error)}`);
      }

      await _preloadFonts();
      if (isServingLocally()) _initLocalDeveloperTools();
      ready();
      await new Promise<never>(() => {});
    }).catch(reject);
  });
}

// Only access the DOM for prerequisites needed before the first render.
// Avoid any work that could instead be done in the loading screen or someplace else.
export async function initApp():Promise<boolean> {
  if (!_areRequiredBrowserApisSupported()) {
    _showFatalErrorMessage("Castle Mystery can't run on your browser because required APIs are unavailable. You could try a different browser or updating the one you are using.");
    return false;
  }
  try {
    await initAppMetaData(); // DecentBar and the IndexedDB namespace need app metadata.
    await _initializeWithStorageLock(navigator.locks);
    return true;
  } catch (error) {
    _showFatalErrorMessage(error instanceof Error ? error.message : String(error));
    return false;
  }
}