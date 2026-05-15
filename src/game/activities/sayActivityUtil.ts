import { createSpeechEvent } from "../itineraryUtil";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
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

export function tryCreateSayActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  if (!activityText.trim().startsWith('says ')) return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampKind);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampKind);
  return [createSpeechEvent(activityStartTime, _parseSpeechText(activityText.trim()))];
}
