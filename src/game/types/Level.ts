import Character from "./Character";
import Room from "./Room"

type Level = {
  rooms:Room[],
  characters:Character[],
  activeCharacterId:string,
  startTime:number
}

export default Level;