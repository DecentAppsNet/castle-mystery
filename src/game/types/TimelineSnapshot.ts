import Effect from "../effects/types/Effect"
import Character from "./Character"
import Room from "./Room"

type TimelineSnapshot = {
  activeCharacter:Character,
  activeRoom:Room,
  characters:Character[],
  characterEffects:Effect[][]
  rooms:Room[]
}

export default TimelineSnapshot;