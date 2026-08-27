import CharacterWithEffects from "./CharacterWithEffects"
import Room from "./Room"

type TimelineSnapshot = {
  activeCharacter:CharacterWithEffects,
  activeRoom:Room,
  characters:CharacterWithEffects[],
  rooms:Room[]
}

export default TimelineSnapshot;