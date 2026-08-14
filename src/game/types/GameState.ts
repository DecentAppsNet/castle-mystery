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
import TimelineSnapshot from "./TimelineSnapshot";

// Unless otherwise noted, "readonly" is intended deeply despite shallow Typescript checks.
type GameState = {
  activeCharacterId:string,
  activeEffects:Effect[],
  camera:Camera,
  conclusions:Conclusion[],
  conclusionsRevision:number,
  discoveredCharacterIds:string[],
  discoveredItemIds:string[],
  hoveredCharacterId:string|null,
  hoveredExitKey:string|null,
  hoveredItemId:string|null,
  hoveredRoomId:string|null,
  isLevelComplete:boolean,
  isPlaying:boolean,
  labels:TimeLabel[],
  lastActiveCharacterChangedValue:string,
  lastMinutesChangedCallRealTime:number,
  lastMinutesChangedValue:number,
  lastNotifiedConclusionsRevision:number,
  lastNotifiedDiscoveriesKey:string
  readonly backgroundImageUrl:string|null,
  readonly baseCharacters:Character[], // Individual elements mutated with updates to discovery status.
  readonly baseItemsById:Map<string, Item>, // Individual elements mutated with updates to discovery status.
  readonly baseRooms:Room[], // Individual elements mutated with updates to discovery status.
  readonly discoverableCharacterCount:number,
  readonly discoverableItemCount:number,
  readonly discoverableRoomCount:number,
  readonly duration:number,
  readonly groundFloorY:number,
  readonly imageSet:ImageSet,
  readonly startTime:number,
  readonly timeline:Timeline;
  readonly winSynopsis:string,
  realTimeToGameTimeOffset:number,
  roomShellCacheByRoomId:RoomShellCache,
  roomShellCacheKey:string,
  roomTitleWrapsByRoomId:Map<string, string[]>,
  roomTitleWrapScalingFactors:ScalingFactors,
  scalingFactors: ScalingFactors,
  time:number,
  timelineSnapshot:TimelineSnapshot,
  viewedItemIds:Set<string>,
}

export default GameState;