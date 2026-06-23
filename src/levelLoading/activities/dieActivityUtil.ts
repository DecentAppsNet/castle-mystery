/* This module groups death-activity parsing for itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createDieEvent } from "@/game/itineraryUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findSentenceStyleActivityVerb } from "./activity/activityTextParseUtil";

function _assertNoTrailingDeathText(activityText:string) {
  const trimmedActivityText = activityText.trim();
  if (trimmedActivityText !== 'dies' && trimmedActivityText !== 'dies.') {
    throw new Error(`unexpected extra text in authored activity '${activityText}'`);
  }
}

export function tryCreateDieActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const verb = findSentenceStyleActivityVerb(activityText, ['dies'] as const);
  if (!verb) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  _assertNoTrailingDeathText(activityText);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  return [createDieEvent(activityStartTime)];
}