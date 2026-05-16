import TimeLabel from "./TimeLabel";
import Character from "./Character";
import ImageSet from "./ImageSet";
import Room from "./Room";
import ScalingFactors from "./ScalingFactors";
import Effect from "../effects/types/Effect";
import Solution from "../solutions/types/Solution";

type GameState = {
  characters:Character[],
  rooms:Room[],
  solutions:Solution[],
  readonly imageSet:ImageSet,
  readonly initialCharacters:Character[],
  readonly initialRooms:Room[],
  activeEffects:Effect[],
  hoveredItemId:string|null,
  hoveredCharacterId:string|null,
  viewedItemIds:Set<string>,
  activeCharacterI:number,
  isPlaying:boolean,
  realTimeToGameTimeOffset:number,
  time:number,
  readonly duration:number,
  labels:TimeLabel[],
  scalingFactors: ScalingFactors,
  lastMinutesChangedCallRealTime:number,
  lastMinutesChangedValue:number,
  lastActiveCharacterChangedValue:string,
  solutionsRevision:number,
  lastNotifiedSolutionsRevision:number
}

export default GameState;