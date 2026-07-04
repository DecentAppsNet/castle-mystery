/* This module groups home-screen gameplay interaction helpers that translate UI actions into player events and state updates.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { MSECS_IN_MINUTE } from "@/common/timeUtil";
import Conclusion from "@/game/conclusions/types/Conclusion";
import { changeConclusions, changeTime, nextCharacter, playPause } from "@/game/playerEventUtil";

export function msecsToMinutes(msecs:number):number {
  return msecs / MSECS_IN_MINUTE;
}

function _minutesToMsecs(minutes:number):number {
  return minutes * MSECS_IN_MINUTE;
}

export function updatePlayPause(isPlaying:boolean, setIsPlaying:(isPlaying:boolean) => void) {
  playPause(isPlaying);
  setIsPlaying(isPlaying);
}

export function updateTime(minutes:number, setIsPlaying:(isPlaying:boolean) => void) {
  changeTime(_minutesToMsecs(minutes));
  setIsPlaying(false);
}

export function updateTimeMsecs(time:number, startTime:number, duration:number, setIsPlaying:(isPlaying:boolean) => void) {
  changeTime(clamp(time, startTime, startTime + duration));
  setIsPlaying(false);
}

export function updateConclusions(nextConclusions:Conclusion[], setConclusions:(conclusions:Conclusion[]) => void) {
  setConclusions(nextConclusions); // Update for React UI.
  changeConclusions(nextConclusions); // Update gameState.
}

export function updateNextCharacter() {
  nextCharacter();
}