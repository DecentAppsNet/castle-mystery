import TimeLabel from "./TimeLabel";
import Character from "./Character";
import Room from "./Room"

type Level = {
  rooms:Room[],
  characters:Character[],
  activeCharacterId:string,
  startTime:number,
  duration:number,
  labels:TimeLabel[]
}

export default Level;