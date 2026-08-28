import CharacterEffectDrawContext from "./CharacterEffectDrawContext"

type EffectDrawCall = | {
  stage:'beforeCharacter',
  characterContext:CharacterEffectDrawContext
} | {
  stage:'afterCharacter',
  characterContext:CharacterEffectDrawContext
}

export default EffectDrawCall;