/* This module groups standing, sitting, kneeling, and laying activity parsing for itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import type { BodyOrientation } from "@/game/types/Character";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createBodyOrientationEvent } from "@/game/itineraryUtil";
import { ActivityContext, calcActivityStartTime, ensureTimestampIsAvailable, findSentenceStyleActivityVerb } from "./activityUtil";

type BodyOrientationVerb = 'stands' | 'sits' | 'kneels' | 'lays';

function _parseBodyOrientation(activityText:string, verb:BodyOrientationVerb):BodyOrientation {
  const trimmedActivityText = activityText.trim();
  if (trimmedActivityText !== verb && trimmedActivityText !== `${verb}.`) {
    throw new Error(`unexpected extra text in authored activity '${activityText}'`);
  }
  switch (verb) {
    case 'stands': return 'standing';
    case 'sits': return 'sitting';
    case 'kneels': return 'kneeling';
    case 'lays': return 'laying';
  }
}

export function tryCreateBodyOrientationActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const verb = findSentenceStyleActivityVerb(activityText, ['stands', 'sits', 'kneels', 'lays'] as const);
  if (!verb) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  return [createBodyOrientationEvent(activityStartTime, _parseBodyOrientation(activityText, verb))];
}