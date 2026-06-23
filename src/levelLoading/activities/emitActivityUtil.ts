/* This module groups item-emit activity parsing and validation during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { createEmitEvent } from "@/game/itineraryUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import type ActivityContext from "./activity/types/ActivityContext";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findTargetPositionAtTime } from "./activity/activityTargetingUtil";
import { findSentenceStyleActivityVerb, parseSentenceStyleActivityText } from "./activity/activityTextParseUtil";

function _parseEmitText(activityText:string):string {
  return parseSentenceStyleActivityText(activityText, 'emits', 'emit');
}

export function tryCreateEmitActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  if (!findSentenceStyleActivityVerb(activityText, ['emits'])) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  if (context.subjectKind === 'item') {
    const itemPosition = findTargetPositionAtTime(context.subjectId, activityStartTime,
      context.charactersById, context.characterStatesById, context.roomItemsByRoomId, context.poseOverridesByCharacterId);
    if (!itemPosition) throw new Error(`item ${context.subjectId} is not available for emit activity`);
    return [createEmitEvent(activityStartTime, context.subjectId, _parseEmitText(activityText))];
  }
  if (context.subjectKind !== 'character') return null;
  return [createEmitEvent(activityStartTime, null, _parseEmitText(activityText))];
}
