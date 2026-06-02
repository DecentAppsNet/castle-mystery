import ItineraryEventBase from "./ItineraryEventBase";

type SpeechEvent = Readonly<ItineraryEventBase & {
  speech:string
}>

export function duplicateSpeechEvent(from:SpeechEvent):SpeechEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    speech:from.speech,
    duration:from.duration
  };
}

export default SpeechEvent;