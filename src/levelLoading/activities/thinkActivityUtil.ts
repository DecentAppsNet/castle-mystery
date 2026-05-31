import { formatMsecsAsTimestamp } from "@/common/timestampUtil";
import { createThoughtEvent } from "@/game/itineraryUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import ThoughtEvent from "@/game/types/itineraryEvents/ThoughtEvent";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable } from "./activityUtil";

function _parseThoughtText(activityText:string):string {
  const thoughtText = activityText.slice("thinks".length).trim();
  if (!thoughtText.length) throw new Error(`missing thought text in authored activity '${activityText}'`);
  if (thoughtText.startsWith('"')) {
    const closingQuoteIndex = thoughtText.lastIndexOf('"');
    if (closingQuoteIndex <= 0) throw new Error(`unterminated thought text in authored activity '${activityText}'`);
    return thoughtText.slice(1, closingQuoteIndex);
  }
  return thoughtText;
}

function _findOverlappingThoughtEvent(events:ItineraryEvent[], thoughtEvent:ThoughtEvent):ThoughtEvent|null {
  return events.find(event =>
    event.type === ItineraryEventType.THOUGHT
    && thoughtEvent.startTime < event.startTime + event.duration
    && event.startTime < thoughtEvent.startTime + thoughtEvent.duration) as ThoughtEvent | undefined || null;
}

function _createOverlappingThoughtMessage(overlappingThoughtEvent:ThoughtEvent, thoughtEvent:ThoughtEvent, timestampType:ActivityContext['timestampType']):string {
  const overlappingThoughtEndTime = overlappingThoughtEvent.startTime + overlappingThoughtEvent.duration;
  const explanation = timestampType === 'absolute'
    ? `This usually means an absolute timestamp started a new thought before the previous one finished.`
    : `This thought would begin before the previous thought finished.`;
  return `same character thought overlap: '${thoughtEvent.thought}' starts at ${formatMsecsAsTimestamp(thoughtEvent.startTime)} before earlier thought '${overlappingThoughtEvent.thought}' ends at ${formatMsecsAsTimestamp(overlappingThoughtEndTime)}. ${explanation} Move the later thought later, or use ':' if it should wait for the previous activity.`;
}

export function tryCreateThinkActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const trimmedActivityText = activityText.trim();
  if (!trimmedActivityText.startsWith('thinks ')) return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const thoughtEvent = createThoughtEvent(activityStartTime, _parseThoughtText(trimmedActivityText));
  const overlappingThoughtEvent = _findOverlappingThoughtEvent(context.state.events, thoughtEvent);
  if (overlappingThoughtEvent) throw new Error(_createOverlappingThoughtMessage(overlappingThoughtEvent, thoughtEvent, context.timestampType));
  return [thoughtEvent];
}
