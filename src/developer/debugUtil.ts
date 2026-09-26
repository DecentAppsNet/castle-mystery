/* This module registers developer debugging helpers on the runtime global object.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { formatMsecsAsTimestamp } from "@/levelLoading/activityLoading";

type CastleDebug = {
  formatMsecsAsTimestamp:(milliseconds:number) => string;
};

declare global {
  var castleDebug:CastleDebug|undefined;
}

export function initCastleDebug():void {
  globalThis.castleDebug = { formatMsecsAsTimestamp };
}