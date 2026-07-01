/* This module groups character replacement activity validation for authored `becomes` itinerary text.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { normalizeId } from "@/game/idUtil";
import { createBecomesCharacterEvent } from "@/game/itineraryUtil";
import Character from "@/game/types/Character";
import type ActivityContext from "./activity/types/ActivityContext";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
import { findSentenceStyleActivityVerb, parseSentenceStyleActivityText } from "./activity/activityTextParseUtil";

function _matchesCharacterReference(character:Character, reference:string):boolean {
  const normalizedReference = normalizeId(reference);
  return character.id === normalizedReference || normalizeId(character.title) === normalizedReference;
}

function _findLevelCharacterId(context:ActivityContext, characterRef:string):string|null {
  for (const character of context.level.allCharactersById.values()) {
    if (_matchesCharacterReference(character, characterRef)) return character.id;
  }
  return null;
}

function _isCharacterCurrentlyPlaced(context:ActivityContext, characterId:string):boolean {
  return context.characterStatesById.has(characterId);
}

function _checkBecomesSourceCharacterIsPlaced(context:ActivityContext, activityText:string) {
  if (_isCharacterCurrentlyPlaced(context, context.subjectId)) return;
  throw new Error(`unknown character replacement source '${context.subjectId}' in authored activity '${activityText}'`);
}

function _resolveBecomesTargetCharacterIdOrThrow(context:ActivityContext, targetRef:string, activityText:string):string {
  const targetCharacterId = _findLevelCharacterId(context, targetRef);
  if (!targetCharacterId) throw new Error(`unknown character replacement target '${targetRef}' in authored activity '${activityText}'`);
  if (targetCharacterId === context.subjectId) {
    throw new Error(`character replacement target '${targetRef}' must differ from source in authored activity '${activityText}'`);
  }
  if (_isCharacterCurrentlyPlaced(context, targetCharacterId)) {
    throw new Error(`character replacement target '${targetRef}' must start unplaced in authored activity '${activityText}'`);
  }
  return targetCharacterId;
}

export function tryCreateBecomesCharacterActivity(activityText:string, context:ActivityContext) {
  const becomesVerb = findSentenceStyleActivityVerb(activityText, ['becomes'] as const);
  if (!becomesVerb) return null;
  if (context.subjectKind !== 'character') return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  if (!context.level.allCharactersById.get(context.subjectId)) {
    throw new Error(`unknown character replacement source '${context.subjectId}' in authored activity '${activityText}'`);
  }
  _checkBecomesSourceCharacterIsPlaced(context, activityText);
  const targetRef = parseSentenceStyleActivityText(activityText, becomesVerb, 'replacement target');
  const targetCharacterId = _resolveBecomesTargetCharacterIdOrThrow(context, targetRef, activityText);
  return [createBecomesCharacterEvent(activityStartTime, context.subjectId, targetCharacterId)];
}