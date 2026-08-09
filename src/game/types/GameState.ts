import TimeLabel from "./TimeLabel";
import Camera from "./Camera";
import Character from "./Character";
import ImageSet from "./ImageSet";
import Item from "./Item";
import Room from "./Room";
import ScalingFactors from "./ScalingFactors";
import Effect from "../effects/types/Effect";
import Conclusion from "../conclusions/types/Conclusion";
import RoomShellCache from "./RoomShellCache";
import Timeline from "./Timeline";

type GameState = {
  characters:Character[],
  unplacedCharactersById:Map<string, Character>,
  rooms:Room[],
  itemsById:Map<string, Item>,
  unplacedItemsById:Map<string, Item>,
  discoveredCharacterIds:string[],
  discoveredItemIds:string[],
  readonly timeline:Timeline;
  readonly discoverableCharacterCount:number,
  readonly discoverableItemCount:number,
  readonly discoverableRoomCount:number,
  conclusions:Conclusion[],
  readonly winSynopsis:string,
  readonly backgroundImageUrl:string|null,
  readonly groundFloorY:number,
  readonly imageSet:ImageSet,
  readonly initialItemsById:Map<string, Item>,
  readonly initialUnplacedItemsById:Map<string, Item>,
  readonly initialCharacters:Character[],
  readonly initialUnplacedCharactersById:Map<string, Character>,
  readonly initialRooms:Room[],
  camera:Camera,
  activeEffects:Effect[],
  hoveredItemId:string|null,
  hoveredCharacterId:string|null,
  hoveredExitKey:string|null,
  hoveredRoomId:string|null,
  viewedItemIds:Set<string>,
  activeCharacterId:string,
  isLevelComplete:boolean,
  isPlaying:boolean,
  realTimeToGameTimeOffset:number,
  time:number,
  readonly startTime:number,
  readonly duration:number,
  labels:TimeLabel[],
  scalingFactors: ScalingFactors,
  roomTitleWrapScalingFactors:ScalingFactors,
  roomTitleWrapsByRoomId:Map<string, string[]>,
  roomShellCacheByRoomId:RoomShellCache,
  roomShellCacheKey:string,
  lastMinutesChangedCallRealTime:number,
  lastMinutesChangedValue:number,
  lastActiveCharacterChangedValue:string,
  conclusionsRevision:number,
  lastNotifiedConclusionsRevision:number,
  lastNotifiedDiscoveriesKey:string
}

export default GameState;