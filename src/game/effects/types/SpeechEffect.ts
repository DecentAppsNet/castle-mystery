import EffectBase from "./EffectBase";

type SpeechEffect = EffectBase & {
  speechKind:'says'|'emits'|'thinks',
  text:string
}

export function duplicateSpeechEffect(from:SpeechEffect):SpeechEffect {
  return {...from};
}

export default SpeechEffect;