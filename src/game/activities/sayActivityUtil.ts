import { createSpeechEvent } from "../itineraryUtil";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import { ActivityContext, ensureTimestampIsAvailable, findStatePoseAtTime } from "./activityUtil";

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
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText);
  const pose = findStatePoseAtTime(context.character, context.state, context.timestamp);
  return [createSpeechEvent(context.timestamp, _parseSpeechText(activityText.trim()), pose.facingAngle)];
}
