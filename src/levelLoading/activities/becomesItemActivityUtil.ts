/* This module groups item replacement activity validation for authored `becomes` itinerary text.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { matchesItemReference } from "./activity/activityItemRefUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { findStateOwnedItem } from "./activity/activityStateUtil";
import { findRoomItemById } from "./activity/activityTargetingUtil";
import { findSentenceStyleActivityVerb, parseSentenceStyleActivityText } from "./activity/activityTextParseUtil";

function _findLevelItemId(context:ActivityContext, itemRef:string):string|null {
  for (const item of context.level.itemsById.values()) {
    if (matchesItemReference(item, itemRef)) return item.id;
  }
  return null;
}

function _isItemCurrentlyPlaced(context:ActivityContext, itemId:string):boolean {
  if (findRoomItemById(context.roomItemsByRoomId, context.level, itemId)) return true;
  for (const state of context.characterStatesById.values()) {
    if (findStateOwnedItem(state, itemId)) return true;
  }
  return false;
}

function _assertBecomesSourceItemIsPlaced(context:ActivityContext, activityText:string) {
  if (_isItemCurrentlyPlaced(context, context.subjectId)) return;
  throw new Error(`unknown item replacement source '${context.subjectId}' in authored activity '${activityText}'`);
}

function _resolveBecomesTargetItemIdOrThrow(context:ActivityContext, targetRef:string, activityText:string):string {
  const targetItemId = _findLevelItemId(context, targetRef);
  if (!targetItemId) throw new Error(`unknown item replacement target '${targetRef}' in authored activity '${activityText}'`);
  if (targetItemId === context.subjectId) throw new Error(`item replacement target '${targetRef}' must differ from source in authored activity '${activityText}'`);
  if (_isItemCurrentlyPlaced(context, targetItemId)) {
    throw new Error(`item replacement target '${targetRef}' must start unplaced in authored activity '${activityText}'`);
  }
  return targetItemId;
}

export function tryCreateBecomesItemActivity(activityText:string, context:ActivityContext) {
  const becomesVerb = findSentenceStyleActivityVerb(activityText, ['becomes'] as const);
  if (!becomesVerb) return null;
  if (context.subjectKind !== 'item') return null;

  assertNonNullable(context.level.itemsById.get(context.subjectId), `unknown item '${context.subjectId}' in level itemsById`);
  _assertBecomesSourceItemIsPlaced(context, activityText);
  const targetRef = parseSentenceStyleActivityText(activityText, becomesVerb, 'replacement target');
  _resolveBecomesTargetItemIdOrThrow(context, targetRef, activityText);
  return [];
}