import EffectBase from "./EffectBase";

export type SpeechKind = 'says'|'emits'|'thinks';

type SpeechEffect = EffectBase & {
  speechKind:SpeechKind,
  text:string
}

export function duplicateSpeechEffect(from:SpeechEffect):SpeechEffect {
  return {...from};
}

export default SpeechEffect;