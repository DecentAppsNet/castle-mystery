import TimeLabel from "./TimeLabel";
import Character from "./Character";
import Room from "./Room"
import Solution from "../solutions/types/Solution";

type Level = Readonly<{
  rooms:Room[],
  initialCharacters:Character[],
  characters:Character[],
  solutions:Solution[],
  winSynopsis:string,
  activeCharacterId:string,
  startTime:number,
  duration:number,
  labels:TimeLabel[]
}>

export default Level;