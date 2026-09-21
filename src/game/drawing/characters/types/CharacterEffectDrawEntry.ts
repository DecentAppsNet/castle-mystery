import CharacterEffectDrawContext from "@/game/effects/types/CharacterEffectDrawContext"
import CharacterWithEffects from "@/game/types/CharacterWithEffects"

type CharacterEffectDrawEntry = Readonly<{
  character:CharacterWithEffects,
  characterContext:CharacterEffectDrawContext
}>;

export default CharacterEffectDrawEntry;