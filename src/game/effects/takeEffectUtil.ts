/* This file creates take-item timeline effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Effect from "./types/Effect";
import { CharacterOwnedItemPlacement } from "../itemOwnershipUtil";

const TAKE_EFFECT_TIME = 500;

export function createTakeEffect(_itemId:string, _target:CharacterOwnedItemPlacement, startTime:number):Effect {
  // TODO
  return {
    kind:'takeItem',
    startTime,
    endTime:startTime+TAKE_EFFECT_TIME,
    handler:null
  }
}