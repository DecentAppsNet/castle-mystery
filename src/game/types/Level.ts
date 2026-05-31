import TimeLabel from "./TimeLabel";
import Character from "./Character";
import Item from "./Item";
import Room from "./Room"
import Solution from "../solutions/types/Solution";

type Level = Readonly<{
  rooms:Room[],
  initialCharacters:Character[],
  characters:Character[],
  itemsById:Map<string, Item>,
  solutions:Solution[],
  winSynopsis:string,
  backgroundImageUrl:string|null,
  groundFloorY:number,
  activeCharacterId:string,
  startTime:number,
  initialTime:number,
  endTime:number,
  duration:number,
  labels:TimeLabel[]
}>

export function createDefaultLevel():Level {
  return {
    rooms:[],
    initialCharacters:[],
    characters:[],
    itemsById:new Map<string, Item>(),
    solutions:[],
    winSynopsis:'',
    backgroundImageUrl:null,
    groundFloorY:0,
    activeCharacterId:'',
    startTime:0,
    initialTime:0,
    endTime:0,
    duration:0,
    labels:[]
  };
}

export default Level;