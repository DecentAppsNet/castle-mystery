/* This file manages the lifecycle of short-lived effects whose timing is based on meta-time.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Effect from "./types/Effect";

/** Removes effects whose half-open meta-time lifetime has ended. */
export function removeExpiredMetaTimeEffects(effects:Effect[], metaTime:number):void {
  for (let effectI = effects.length - 1; effectI >= 0; --effectI) {
    if (effects[effectI].endTime <= metaTime) effects.splice(effectI, 1);
  }
}