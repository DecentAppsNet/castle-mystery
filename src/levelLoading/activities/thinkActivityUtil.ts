/* This module groups thought-activity parsing and overlap validation during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { formatMsecsAsTimestamp } from "@/levelLoading/timestampUtil";
import { createThoughtEvent } from "@/game/itineraryUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import ThoughtEvent from "@/game/types/itineraryEvents/ThoughtEvent";
import type ActivityContext from "./activity/types/ActivityContext";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findSentenceStyleActivityVerb, parseSentenceStyleActivityText } from "./activity/activityTextParseUtil";

function _parseThoughtText(activityText:string):string {
  return parseSentenceStyleActivityText(activityText, 'thinks', 'thought');
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
  if (!findSentenceStyleActivityVerb(activityText, ['thinks'])) return null;
  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const thoughtEvent = createThoughtEvent(activityStartTime, _parseThoughtText(activityText));
  const overlappingThoughtEvent = _findOverlappingThoughtEvent(context.state.events, thoughtEvent);
  if (overlappingThoughtEvent) throw new Error(_createOverlappingThoughtMessage(overlappingThoughtEvent, thoughtEvent, context.timestampType));
  return [thoughtEvent];
}
