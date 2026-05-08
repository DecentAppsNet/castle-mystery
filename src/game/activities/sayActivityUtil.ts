import { createSpeechEvent } from "../itineraryUtil";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import { AuthoredActivityContext, ensureTimestampIsAvailable } from "./activityUtil";

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

export function tryCreateSayActivity(activityText:string, context:AuthoredActivityContext):ItineraryEvent[]|null {
  if (!activityText.trim().startsWith('says ')) return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText);
  return [createSpeechEvent(context.timestamp, _parseSpeechText(activityText.trim()), context.state.facingAngle)];
}
