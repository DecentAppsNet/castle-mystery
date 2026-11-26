import TimeLabel from "@/game/types/TimeLabel";
import Character from "@/game/types/Character";
import Item from "@/game/types/Item";
import Room from "@/game/types/Room";
import Conclusion from "@/game/conclusions/types/Conclusion";
import Timeline, { createDefaultTimeline } from "@/game/types/Timeline";
import DiscoveryConfig from "@/game/types/DiscoveryConfig";

export type MutableLevel = {
  title:string,
  description:string,
  rooms:Room[],
  characters:Character[],
  itemsById:Map<string, Item>,
  discoveryConfig:DiscoveryConfig,
  conclusions:Conclusion[],
  winSynopsis:string,
  backgroundImageUrl:string|null,
  groundFloorY:number,
  activeCharacterId:string,
  initialTime:number,
  labels:TimeLabel[],
  timeline:Timeline
}

type Level = Readonly<MutableLevel>;

export function createDefaultMutableLevel():MutableLevel {
  return {
    title:'',
    description:'',
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
    initialTime:0,
    labels:[],
    timeline:createDefaultTimeline()
  };
}

export default Level;