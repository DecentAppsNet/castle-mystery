import Character from "./Character";
import Room from "./Room";

type GameState = {
  characters:Character[],
  rooms:Room[],
  activeCharacterI:number,
  isPlaying:boolean,
  realToGameTimeOffset:number,
  time:number
}

export default GameState;