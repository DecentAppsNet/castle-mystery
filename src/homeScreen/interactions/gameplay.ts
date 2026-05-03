import { MSECS_IN_MINUTE } from "@/common/timeUtil";
import { changeTime, playPause } from "@/game/playerEventUtil";

export function updatePlayPause(isPlaying:boolean, setIsPlaying:(isPlaying:boolean) => void) {
  playPause(isPlaying);
  setIsPlaying(isPlaying);
}

export function updateTime(minutes:number, setIsPlaying:(isPlaying:boolean) => void) {
  changeTime(minutes * MSECS_IN_MINUTE);
  setIsPlaying(false);
}