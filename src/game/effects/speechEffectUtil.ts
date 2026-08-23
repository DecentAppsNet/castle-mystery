import SpeechEffect, { SpeechKind } from "./types/SpeechEffect";

export function createSpeechEffect(speechKind:SpeechKind, text:string, startTime:number, speechDuration:number):SpeechEffect {
  return {
    kind:'speech',
    speechKind,
    text,
    startTime,
    endTime:startTime+speechDuration,
    handler:null
  }
}