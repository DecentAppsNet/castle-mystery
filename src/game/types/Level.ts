import TimeLabel from "./TimeLabel";
import Character from "./Character";
import Item from "./Item";
import Room from "./Room"
import Conclusion from "../conclusions/types/Conclusion";
import Timeline, { createDefaultTimeline } from "./Timeline";
import DiscoveryConfig from "./DiscoveryConfig";

export type MutableLevel = {
  rooms:Room[],
  characters:Character[],
  itemsById:Map<string, Item>,
  discoveryConfig:DiscoveryConfig,
  conclusions:Conclusion[],
  winSynopsis:string,
  backgroundImageUrl:string|null,
  groundFloorY:number,
  activeCharacterId:string,
  startTime:number,
  initialTime:number,
  endTime:number,
  labels:TimeLabel[],
  timeline:Timeline
}

type Level = Readonly<MutableLevel>;

export function createDefaultMutableLevel():MutableLevel {
  return {
    rooms:[],
    characters:[],
    itemsById:new Map<string, Item>(),
    discoveryConfig:{
      initiallyKnownTitleCharacterIds:new Set<string>(),
      initiallyObscuredRoomIds:new Set<string>(),
      discoverableCharacterCount:0,
      discoverableItemCount:0,
      discoverableRoomCount:0
    },
    conclusions:[],
    winSynopsis:'',
    backgroundImageUrl:null,
    groundFloorY:0,
    activeCharacterId:'',
    startTime:0,
    initialTime:0,
    endTime:0,
    labels:[],
    timeline:createDefaultTimeline()
  };
}

export function createDefaultLevel():Level {
  return createDefaultMutableLevel();
}

export default Level;