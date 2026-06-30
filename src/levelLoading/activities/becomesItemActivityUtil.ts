/* This module groups item replacement activity validation for authored `becomes` itinerary text.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { createBecomesItemEvent } from "@/game/itineraryUtil";
import { addOwnedItem, removeOwnedItemById } from "@/game/itemOwnershipUtil";
import Item, { duplicateItem } from "@/game/types/Item";
import ItemHoldLocation from "@/game/types/ItemHoldLocation";
import { matchesItemReference } from "./activity/activityItemRefUtil";
import type ActivityContext from "./activity/types/ActivityContext";
import { findStateOwnedItem } from "./activity/activityStateUtil";
import { findRoomItemById } from "./activity/activityTargetingUtil";
import { calcActivityStartTime, ensureTimestampIsAvailable } from "./activity/activitySchedulingUtil";
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

function _createReplacementItem(sourceItem:Item, targetItem:Item):Item {
  return {
    ...duplicateItem(targetItem),
    position:{ ...sourceItem.position },
    drawOffset:{ ...sourceItem.drawOffset },
    stackOffset:{ ...sourceItem.stackOffset },
    isVisible:sourceItem.isVisible,
    isDiscovered:sourceItem.isDiscovered
  };
}

function _findStateOwnedItemLocationOrThrow(context:ActivityContext, activityText:string):ItemHoldLocation {
  if (context.state.leftHandItem?.id === context.subjectId) return 'left-hand';
  if (context.state.rightHandItem?.id === context.subjectId) return 'right-hand';
  if (context.state.items.some(item => item.id === context.subjectId)) return 'inventory';
  throw new Error(`unknown item replacement source '${context.subjectId}' in authored activity '${activityText}'`);
}

function _applyRoomReplacement(context:ActivityContext, sourceItemId:string, targetItem:Item) {
  const roomMatch = findRoomItemById(context.roomItemsByRoomId, context.level, sourceItemId);
  if (!roomMatch) return false;
  const roomItems = context.roomItemsByRoomId.get(roomMatch.room.id);
  assertNonNullable(roomItems, `missing room items for room ${roomMatch.room.id}`);
  const itemIndex = roomItems.findIndex(item => item.id === roomMatch.item.id);
  assertNonNullable(itemIndex === -1 ? null : roomItems[itemIndex], `missing room item ${roomMatch.item.id}`);
  roomItems.splice(itemIndex, 1, _createReplacementItem(roomMatch.item, targetItem));
  return true;
}

function _applyOwnedReplacement(context:ActivityContext, sourceItemId:string, targetItem:Item, activityText:string) {
  const sourceItem = findStateOwnedItem(context.state, sourceItemId);
  if (!sourceItem) return false;
  const location = _findStateOwnedItemLocationOrThrow(context, activityText);
  removeOwnedItemById(context.state, sourceItem.id);
  addOwnedItem(context.state, _createReplacementItem(sourceItem, targetItem), location);
  return true;
}

export function tryCreateBecomesItemActivity(activityText:string, context:ActivityContext) {
  const becomesVerb = findSentenceStyleActivityVerb(activityText, ['becomes'] as const);
  if (!becomesVerb) return null;
  if (context.subjectKind !== 'item') return null;

  ensureTimestampIsAvailable(context.state, context.timestamp, activityText, context.timestampType);
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  assertNonNullable(context.level.itemsById.get(context.subjectId), `unknown item '${context.subjectId}' in level itemsById`);
  _assertBecomesSourceItemIsPlaced(context, activityText);
  const targetRef = parseSentenceStyleActivityText(activityText, becomesVerb, 'replacement target');
  const targetItemId = _resolveBecomesTargetItemIdOrThrow(context, targetRef, activityText);
  const targetItem = context.level.itemsById.get(targetItemId) || null;
  assertNonNullable(targetItem, `unknown replacement target item '${targetItemId}' in level itemsById`);
  const didReplace = _applyRoomReplacement(context, context.subjectId, targetItem)
    || _applyOwnedReplacement(context, context.subjectId, targetItem, activityText);
  assertNonNullable(didReplace ? targetItemId : null, `failed to apply item replacement for '${activityText}'`);
  return [createBecomesItemEvent(activityStartTime, context.subjectId, targetItemId)];
}