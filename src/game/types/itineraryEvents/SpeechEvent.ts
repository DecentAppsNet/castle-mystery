/* This module groups the speech itinerary event model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

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