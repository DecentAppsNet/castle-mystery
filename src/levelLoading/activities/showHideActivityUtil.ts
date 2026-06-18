/* This module groups show/hide visibility activity parsing and mutable-state updates during itinerary loading.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { normalizeId } from "@/game/idUtil";
import Item from "@/game/types/Item";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";

import {
  ActivityContext,
  calcActivityStartTime,
  ensureTimestampIsAvailable,
  findRoomItemById,
  findSentenceStyleActivityVerb,
  findStateOwnedItem,
  parseSentenceStyleActivityText,
} from "./activityUtil";

type VisibilityVerb = 'show' | 'hide';

function _findCharacterForVisibilityTarget(context:ActivityContext, targetRef:string):{ characterId:string }|null {
  const normalizedTargetRef = normalizeId(targetRef);

  for (const [characterId, character] of context.charactersById.entries()) {
    if (characterId === normalizedTargetRef || normalizeId(character.title) === normalizedTargetRef) {
      return { characterId };
    }
  }

  return null;
}

function _findItemForVisibilityTarget(context:ActivityContext, targetRef:string):Item|null {
  const roomItemLocation = findRoomItemById(context.roomItemsByRoomId, context.level, targetRef);
  if (roomItemLocation) return roomItemLocation.item;

  for (const state of context.characterStatesById.values()) {
    const item = findStateOwnedItem(state, targetRef);
    if (item) return item;
  }

  return null;
}

function _syncLevelItemVisibility(level:ActivityContext['level'], itemId:string, isVisible:boolean) {
  level.rooms.forEach(room => room.items.forEach(item => {
    if (item.id === itemId) item.isVisible = isVisible;
  }));
  level.characters.forEach(character => {
    character.items.forEach(item => {
      if (item.id === itemId) item.isVisible = isVisible;
    });
    if (character.leftHandItem?.id === itemId) character.leftHandItem.isVisible = isVisible;
    if (character.rightHandItem?.id === itemId) character.rightHandItem.isVisible = isVisible;
  });
}

function _applyVisibilityTargetOrThrow(context:ActivityContext, targetRef:string, isVisible:boolean, activityText:string) {
  const characterTarget = _findCharacterForVisibilityTarget(context, targetRef);
  if (characterTarget) {
    const characterState = context.characterStatesById.get(characterTarget.characterId) || null;
    if (!characterState) throw new Error(`missing itinerary state for ${characterTarget.characterId}`);
    characterState.isVisible = isVisible;
    return;
  }

  const item = _findItemForVisibilityTarget(context, targetRef);
  if (item) {
    item.isVisible = isVisible;
    _syncLevelItemVisibility(context.level, item.id, isVisible);
    return;
  }

  throw new Error(`unknown visibility target '${targetRef}' in authored activity '${activityText}'`);
}

export function tryCreateShowHideActivity(activityText:string, context:ActivityContext):ItineraryEvent[]|null {
  const visibilityVerb = findSentenceStyleActivityVerb(activityText, ['show', 'hide'] as const) as VisibilityVerb | null;
  if (!visibilityVerb) return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  const targetRef = parseSentenceStyleActivityText(activityText, visibilityVerb, 'visibility target');
  _applyVisibilityTargetOrThrow(context, targetRef, visibilityVerb === 'show', activityText);
  return [];
}
