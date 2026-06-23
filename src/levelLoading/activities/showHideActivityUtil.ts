/* This module groups show/hide visibility activity parsing and mutable-state updates during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { normalizeId } from "@/game/idUtil";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import { createHideEvent, createShowEvent } from "@/game/itineraryUtil";

import type ActivityContext from "./activity/types/ActivityContext";
import { findStateOwnedItem } from "./activity/activityStateUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findRoomItemById } from "./activity/activityTargetingUtil";
import { findSentenceStyleActivityVerb, parseSentenceStyleActivityText } from "./activity/activityTextParseUtil";

type VisibilityVerb = 'show' | 'hide';

function _findCharacterIdForVisibilityTarget(context:ActivityContext, targetRef:string):string|null {
  const normalizedTargetRef = normalizeId(targetRef);

  for (const [characterId, character] of context.charactersById.entries()) {
    if (characterId === normalizedTargetRef || normalizeId(character.title) === normalizedTargetRef) return characterId;
  }

  return null;
}

function _findItemIdForVisibilityTarget(context:ActivityContext, targetRef:string):string|null {
  const roomItemLocation = findRoomItemById(context.roomItemsByRoomId, context.level, targetRef);
  if (roomItemLocation) return roomItemLocation.item.id;

  for (const state of context.characterStatesById.values()) {
    const item = findStateOwnedItem(state, targetRef);
    if (item) return item.id;
  }

  return null;
}

function _resolveVisibilityTargetIdOrThrow(context:ActivityContext, targetRef:string, activityText:string):string {
  const characterId = _findCharacterIdForVisibilityTarget(context, targetRef);
  if (characterId) return characterId;

  const itemId = _findItemIdForVisibilityTarget(context, targetRef);
  if (itemId) return itemId;

  throw new Error(`unknown visibility target '${targetRef}' in authored activity '${activityText}'`);
}

function _applyVisibilityToCharacterState(context:ActivityContext, targetId:string, isVisible:boolean):boolean {
  const state = context.characterStatesById.get(targetId) || null;
  if (!state) return false;
  state.isVisible = isVisible;
  return true;
}

function _applyVisibilityToRoomItem(context:ActivityContext, targetId:string, isVisible:boolean):boolean {
  const roomItemLocation = findRoomItemById(context.roomItemsByRoomId, context.level, targetId);
  if (!roomItemLocation) return false;
  roomItemLocation.item.isVisible = isVisible;
  return true;
}

function _applyVisibilityToOwnedItem(context:ActivityContext, targetId:string, isVisible:boolean):boolean {
  for (const state of context.characterStatesById.values()) {
    const item = findStateOwnedItem(state, targetId);
    if (!item) continue;
    item.isVisible = isVisible;
    return true;
  }
  return false;
}

function _applyVisibilityToTarget(context:ActivityContext, targetId:string, isVisible:boolean) {
  if (_applyVisibilityToCharacterState(context, targetId, isVisible)) return;
  if (_applyVisibilityToRoomItem(context, targetId, isVisible)) return;
  _applyVisibilityToOwnedItem(context, targetId, isVisible);
}

export function tryCreateShowHideActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const visibilityVerb = findSentenceStyleActivityVerb(activityText, ['show', 'hide'] as const) as VisibilityVerb | null;
  if (!visibilityVerb) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const targetRef = parseSentenceStyleActivityText(activityText, visibilityVerb, 'visibility target');
  const targetId = _resolveVisibilityTargetIdOrThrow(context, targetRef, activityText);
  _applyVisibilityToTarget(context, targetId, visibilityVerb === 'show');
  return [visibilityVerb === 'show' ? createShowEvent(activityStartTime, targetId) : createHideEvent(activityStartTime, targetId)];
}
