/* This module groups app-startup initialization helpers for metadata and local-development seeding.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { setSeed } from "@/common/randUtil";
import { initCastleDebug } from "@/developer/debugUtil";
import { isServingLocally } from "@/developer/devEnvUtil";
import { initAppMetaData } from "decent-portal";

function _initLocalDeveloperTools():void {
  setSeed(0); // Repeatable p-random #s while developing helps with troubleshooting.
  initCastleDebug();
}

// Don't reference the DOM. Avoid any work that could instead be done in the loading screen or someplace else
export async function initApp():Promise<void> {
  await initAppMetaData(); // Useful to have app metadata ready before the app starts because DecentBar needs it.
  if (isServingLocally()) _initLocalDeveloperTools();
}