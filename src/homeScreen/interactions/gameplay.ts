import { MSECS_IN_MINUTE } from "@/common/timeUtil";
import { changeTime, playPause } from "@/game/playerEventUtil";

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