import { clamp } from "@/common/numberUtil";
import { MSECS_IN_MINUTE } from "@/common/timeUtil";
import Solution from "@/game/solutions/types/Solution";
import { changeSolutions, changeTime, playPause } from "@/game/playerEventUtil";

export function msecsToMinutes(msecs:number):number {
  return msecs / MSECS_IN_MINUTE;
}

export function minutesToMsecs(minutes:number):number {
  return minutes * MSECS_IN_MINUTE;
}

export function updatePlayPause(isPlaying:boolean, setIsPlaying:(isPlaying:boolean) => void) {
  playPause(isPlaying);
  setIsPlaying(isPlaying);
}

export function updateTime(minutes:number, setIsPlaying:(isPlaying:boolean) => void) {
  changeTime(minutesToMsecs(minutes));
  setIsPlaying(false);
}

export function updateTimeMsecs(time:number, duration:number, setIsPlaying:(isPlaying:boolean) => void) {
  changeTime(clamp(time, 0, duration));
  setIsPlaying(false);
}

export function updateSolutions(nextSolutions:Solution[], setSolutions:(solutions:Solution[]) => void) {
  setSolutions(nextSolutions); // Update for React UI.
  changeSolutions(nextSolutions); // Update gameState.
}