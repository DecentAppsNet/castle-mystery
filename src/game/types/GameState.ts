import TimeLabel from "./TimeLabel";
import Character from "./Character";
import Room from "./Room";
import ScalingFactors from "./ScalingFactors";

type GameState = {
  characters:Character[],
  rooms:Room[],
  activeCharacterI:number,
  isPlaying:boolean,
  realTimeToGameTimeOffset:number,
  time:number,
  labels:TimeLabel[],
  scalingFactors: ScalingFactors,
  lastMinutesChangedCallRealTime:number,
  lastMinutesChangedValue:number
}

export default GameState;