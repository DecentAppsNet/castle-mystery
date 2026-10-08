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
 await document.fonts.load('1rem Jellee');
}

// Only access the DOM for prerequisites needed before the first render.
// Avoid any work that could instead be done in the loading screen or someplace else.
export async function initApp():Promise<void> {
  await Promise.all([
    initAppMetaData(), // Useful to have app metadata ready before the app starts because DecentBar needs it.
    _preloadFonts()
  ]);
  if (isServingLocally()) _initLocalDeveloperTools();
}