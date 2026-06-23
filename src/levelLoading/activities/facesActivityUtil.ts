/* This module groups explicit facing-direction activity parsing for itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import type { FacingDirection } from "@/game/types/Character";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createFaceEvent } from "@/game/itineraryUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { findStatePoseAtTime } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findTargetPositionAtTime } from "./activity/activityTargetingUtil";
import { findSentenceStyleActivityVerb, stripTrailingPeriod } from "./activity/activityTextParseUtil";

function _parseFacingDirection(activityText:string, context:ActivityContext, activityStartTime:number):FacingDirection {
  const directionText = stripTrailingPeriod(activityText.trim().slice('faces'.length).trim()).toLowerCase();
  if (directionText === 'left' || directionText === 'right') return directionText;
  const targetPosition = findTargetPositionAtTime(directionText, activityStartTime,
    context.charactersById, context.characterStatesById, context.roomItemsByRoomId, context.poseOverridesByCharacterId);
  if (targetPosition) return targetPosition.x < findStatePoseAtTime(context.character, context.state, activityStartTime).position.x ? 'left' : 'right';
  throw new Error(`invalid facing direction '${directionText || '(missing)'}' in authored activity '${activityText}'`);
}

export function tryCreateFaceActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const verb = findSentenceStyleActivityVerb(activityText, ['faces'] as const);
  if (!verb) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  return [createFaceEvent(activityStartTime, _parseFacingDirection(activityText, context, activityStartTime))];
}