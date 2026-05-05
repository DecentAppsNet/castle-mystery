import Character from "./Character";
import Room from "./Room";
import ScalingFactors from "./ScalingFactors";

type GameState = {
  characters:Character[],
  rooms:Room[],
  activeCharacterI:number,
  isPlaying:boolean,
  realToGameTimeOffset:number,
  time:number,
  scalingFactors: ScalingFactors,
  lastMinutesChangedCallRealTime:number,
  lastMinutesChangedValue:number
}

export default GameState;