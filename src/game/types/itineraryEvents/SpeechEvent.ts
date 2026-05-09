import ItineraryEventBase from "./ItineraryEventBase";

type SpeechEvent = Readonly<ItineraryEventBase & {
  speech:string,
  facingAngle:number
}>

export function duplicateSpeechEvent(from:SpeechEvent):SpeechEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    speech:from.speech,
    facingAngle:from.facingAngle,
    duration:from.duration
  };
}

export default SpeechEvent;