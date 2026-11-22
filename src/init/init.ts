/* This module groups app-startup initialization helpers for fonts, metadata, and local-development seeding.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { setSeed } from "@/common/randUtil";
import { initCastleDebug } from "@/developer/debugUtil";
import { isServingLocally } from "@/developer/devEnvUtil";
import { initAppMetaData } from "decent-portal";

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
  return typeof fetch === 'function' && typeof createImageBitmap === 'function'
    && typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined';
}

// Only access the DOM for prerequisites needed before the first render.
// Avoid any work that could instead be done in the loading screen or someplace else.
export async function initApp():Promise<boolean> {
  if (!_areRequiredBrowserApisSupported()) {
    document.body.textContent = "Castle Mystery can't run on your browser.";
    return false;
  }
  await Promise.all([
    initAppMetaData(), // Useful to have app metadata ready before the app starts because DecentBar needs it.
    _preloadFonts()
  ]);
  if (isServingLocally()) _initLocalDeveloperTools();
  return true;
}