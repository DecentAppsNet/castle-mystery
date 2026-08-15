import Character from "./Character"
import Room from "./Room"

type TimelineSnapshot = {
  activeCharacter:Character,
  activeRoom:Room,
  characters:Character[],
  rooms:Room[]
}

export default TimelineSnapshot;