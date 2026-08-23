import EffectCueBase from "./EffectCueBase";

type SpeechCue = EffectCueBase & {
  speechKind:'says'|'emits'|'thinks',
  text:string
}

export function duplicateSpeechCue(from:SpeechCue):SpeechCue {
  return {...from};
}

export default SpeechCue;