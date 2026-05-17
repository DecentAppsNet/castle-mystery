import { createSpeechEvent } from "../itineraryUtil";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "../types/itineraryEvents/ItineraryEventType";
import SpeechEvent from "../types/itineraryEvents/SpeechEvent";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable } from "./activityUtil";

function _parseSpeechText(activityText:string):string {
  const speechText = activityText.slice('says'.length).trim();
  if (!speechText.length) throw new Error(`missing speech text in authored activity '${activityText}'`);
  if (speechText.startsWith('"')) {
    const closingQuoteIndex = speechText.lastIndexOf('"');
    if (closingQuoteIndex <= 0) throw new Error(`unterminated speech text in authored activity '${activityText}'`);
    return speechText.slice(1, closingQuoteIndex);
  }
  return speechText;
}

function _formatTimestamp(milliseconds:number):string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const remainingMilliseconds = milliseconds % 1000;
  const wholeSecondsText = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return remainingMilliseconds === 0
    ? wholeSecondsText
    : `${wholeSecondsText}.${String(remainingMilliseconds).padStart(3, '0')}`;
}

function _findOverlappingSpeechEvent(events:ItineraryEvent[], speechEvent:SpeechEvent):SpeechEvent|null {
  return events.find(event =>
    event.type === ItineraryEventType.SPEECH
    && speechEvent.startTime < event.startTime + event.duration
    && event.startTime < speechEvent.startTime + speechEvent.duration) as SpeechEvent | undefined || null;
}

function _createOverlappingSpeechMessage(overlappingSpeechEvent:SpeechEvent, speechEvent:SpeechEvent, timestampKind:ActivityContext['timestampKind']):string {
  const overlappingSpeechEndTime = overlappingSpeechEvent.startTime + overlappingSpeechEvent.duration;
  const explanation = timestampKind === 'absolute'
    ? `This usually means an absolute timestamp started a new speech before the previous one finished.`
    : `This speech would begin before the previous speech finished.`;
  return `same character speech overlap: '${speechEvent.speech}' starts at ${_formatTimestamp(speechEvent.startTime)} before earlier speech '${overlappingSpeechEvent.speech}' ends at ${_formatTimestamp(overlappingSpeechEndTime)}. ${explanation} Move the later speech later, or use ':' if it should wait for the previous activity.`;
}

export function tryCreateSayActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  if (!activityText.trim().startsWith('says ')) return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  const speechEvent = createSpeechEvent(activityStartTime, _parseSpeechText(activityText.trim()));
  const overlappingSpeechEvent = _findOverlappingSpeechEvent(context.state.events, speechEvent);
  if (overlappingSpeechEvent) throw new Error(_createOverlappingSpeechMessage(overlappingSpeechEvent, speechEvent, context.timestampKind));
  return [speechEvent];
}
