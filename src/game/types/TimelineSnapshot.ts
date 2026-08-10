import Character from "./Character"
import Room from "./Room"

type TimelineSnapshot = {
  characters:Character[],
  rooms:Room[]
}

export default TimelineSnapshot;