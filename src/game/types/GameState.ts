import TimeLabel from "./TimeLabel";
import Camera from "./Camera";
import Character from "./Character";
import ImageSet from "./ImageSet";
import Item from "./Item";
import Room from "./Room";
import ScalingFactors from "./ScalingFactors";
import Effect from "../effects/types/Effect";
import Solution from "../solutions/types/Solution";

type GameState = {
  characters:Character[],
  rooms:Room[],
  itemsById:Map<string, Item>,
  solutions:Solution[],
  readonly winSynopsis:string,
  readonly imageSet:ImageSet,
  readonly initialItemsById:Map<string, Item>,
  readonly initialCharacters:Character[],
  readonly initialRooms:Room[],
  camera:Camera,
  activeEffects:Effect[],
  hoveredItemId:string|null,
  hoveredCharacterId:string|null,
  hoveredExitKey:string|null,
  hoveredRoomId:string|null,
  viewedItemIds:Set<string>,
  activeCharacterI:number,
  isLevelComplete:boolean,
  isPlaying:boolean,
  realTimeToGameTimeOffset:number,
  time:number,
  readonly startTime:number,
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