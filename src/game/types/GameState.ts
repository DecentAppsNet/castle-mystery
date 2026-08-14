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
import DiscoveryState from "./DiscoveryState";

// Unless otherwise noted, "readonly" is intended deeply despite shallow Typescript checks.
type GameState = {
  activeCharacterId:string,
  activeEffects:Effect[],
  camera:Camera,
  conclusions:Conclusion[],
  conclusionsRevision:number,
  readonly discoveryState:DiscoveryState,
  hoveredCharacterId:string|null,
  hoveredExitKey:string|null,
  hoveredItemId:string|null,
  hoveredRoomId:string|null,
  isLevelComplete:boolean,
  isPlaying:boolean,
  labels:TimeLabel[],
  lastActiveCharacterChangedValue:string,
  lastMinutesChangedCallMetaTime:number,
  lastMinutesChangedValue:number,
  lastNotifiedConclusionsRevision:number,
  lastNotifiedDiscoveriesKey:string
  readonly backgroundImageUrl:string|null,
  readonly baseCharacters:Character[],
  readonly baseItemsById:Map<string, Item>,
  readonly baseRooms:Room[],
  readonly duration:number,
  readonly groundFloorY:number,
  readonly imageSet:ImageSet,
  readonly startTime:number,
  readonly timeline:Timeline;
  readonly winSynopsis:string,
  metaTimeToGameTimeOffset:number,
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