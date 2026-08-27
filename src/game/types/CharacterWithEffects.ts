import Effect from "../effects/types/Effect"
import Character from "./Character"

type CharacterWithEffects = Character & {
  effects:Effect[]
}

export default CharacterWithEffects;