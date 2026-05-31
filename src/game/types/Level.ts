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

export default Level;