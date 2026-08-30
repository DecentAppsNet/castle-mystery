import CharacterEffectDrawContext from "./CharacterEffectDrawContext"
import LevelEffectDrawContext from "./LevelEffectDrawContext"

type EffectDrawCall = | {
  stage:'beforeCharacter',
  characterContext:CharacterEffectDrawContext
} | {
  stage:'afterCharacter',
  characterContext:CharacterEffectDrawContext
} | {
  stage:'afterLevel',
  levelContext:LevelEffectDrawContext
}

export default EffectDrawCall;