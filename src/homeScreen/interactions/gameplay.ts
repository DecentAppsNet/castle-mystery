/* This module groups home-screen gameplay interaction helpers that translate UI actions into player events and state updates.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { minutesToMsecs } from "@/common/timeUtil";
import Conclusion from "@/game/conclusions/types/Conclusion";
import { changeConclusions, changeTime, nextCharacter, playPause } from "@/game/playerEventUtil";

/** Handles the playback control changing its play/pause selection. */
export function updatePlayPause(isPlaying:boolean, setIsPlaying:(isPlaying:boolean) => void) {
  playPause(isPlaying);
  setIsPlaying(isPlaying);
}

/** Handles a timeline selection from the slider or keyboard navigation. */
export function updateTime(minutes:number, setIsPlaying:(isPlaying:boolean) => void) {
  changeTime(minutesToMsecs(minutes));
  setIsPlaying(false);
}

/** Handles an answer edit, claim, or Reveal action from the conclusions panel. */
export function updateConclusions(nextConclusions:Conclusion[], setConclusions:(conclusions:Conclusion[]) => void) {
  setConclusions(nextConclusions); // Update for React UI.
  changeConclusions(nextConclusions); // Update gameState.
}

/** Handles the next-character control or keyboard shortcut. */
export function updateNextCharacter() {
  nextCharacter();
}