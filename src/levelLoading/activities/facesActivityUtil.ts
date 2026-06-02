/* This module groups explicit facing-direction activity parsing for itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import type { FacingDirection } from "@/game/types/Character";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createFaceEvent } from "@/game/itineraryUtil";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, findSentenceStyleActivityVerb, stripTrailingPeriod } from "./activityUtil";

function _parseFacingDirection(activityText:string):FacingDirection {
  const directionText = stripTrailingPeriod(activityText.trim().slice('faces'.length).trim()).toLowerCase();
  if (directionText === 'left' || directionText === 'right') return directionText;
  throw new Error(`invalid facing direction '${directionText || '(missing)'}' in authored activity '${activityText}'`);
}

export function tryCreateFaceActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const verb = findSentenceStyleActivityVerb(activityText, ['faces'] as const);
  if (!verb) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  return [createFaceEvent(activityStartTime, _parseFacingDirection(activityText))];
}