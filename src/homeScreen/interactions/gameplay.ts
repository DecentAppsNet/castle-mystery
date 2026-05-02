import { playPause } from "@/game/playerEventUtil";

export function updatePlayPause(isPlaying:boolean, setIsPlaying:(isPlaying:boolean) => void) {
  playPause(isPlaying);
  setIsPlaying(isPlaying);
}