/* This file parses and schedules item transfers between characters.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { assert, assertNonNullable } from "decent-portal";
import { findKeyframeForTime } from "@/game/timeline";
import { findRoomAtPosition } from "@/game/roomUtil";
import { CharacterOwnedItemPlacement, findCharacterOwnedItem, INVENTORY, LEFT_HAND, RIGHT_HAND } from "@/game/itemOwnershipUtil";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import { addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import { arePositionsAdjacent } from "@/game/positionUtil";
import { findClaimedWaypointsFromKeyframe, findNearestIncludedFloorWaypointToPosition } from "../waypointFindingUtil";
import { scheduleCharacterMovementWithinRoom } from "../movementPlanningUtil";
import { hasActiveItemTransferReservation } from "./util/itemTransferReservationUtil";

type PartsShape = { characterId:string, itemId:string, toCharacterId:string };
function _scheduleRemoveOwnedItem(characterKeyframe:CharacterKeyframe, placement:CharacterOwnedItemPlacement,
    itemId:string, characterI:number, time:number, editableTimeline:EditableTimeline) {

  // Remove the item from its captured inventory or hand placement.
  switch (placement) {
    case LEFT_HAND:
      assert(characterKeyframe.leftHandItem?.id === itemId);
      addCharacterKeyChanges({ leftHandItem:null }, characterI, time, editableTimeline);
      break;
    case RIGHT_HAND:
      assert(characterKeyframe.rightHandItem?.id === itemId);
      addCharacterKeyChanges({ rightHandItem:null }, characterI, time, editableTimeline);
      break;
    default:
      assert(placement === INVENTORY);
      addCharacterKeyChanges({ items:characterKeyframe.items.filter(item => item.id !== itemId) }, characterI, time, editableTimeline);
  }
}

/** Creates the accepted syntax for giving activities. */
export function createGivesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const gives = makeVerb('gives');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const to = makeLiteral('to');
  const toCharacterId = makeIdentifier('toCharacterId', 'CharacterId');
  const rootParseStep = makeSequence([characterId, gives, itemId, to, toCharacterId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an item transfer between characters into an editable timeline. */
export function scheduleGivesActivity(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  // Set up activity parts and reject giving to oneself.
  assertNonNullable(activity.startTime);
  const { characterId, itemId, toCharacterId } = activity.parts as PartsShape;
  if (characterId === toCharacterId) {
    errors.addAtLine(`"${characterId}" character can't give an item to themselves.`, activity.lineI);
    return false;
  }

  // Resolve both participants and reject existing item-transfer reservations.
  const fromKeyframe = findKeyframeForTime(editableTimeline.keyframes, activity.startTime);
  const characterI = editableTimeline.characterIdToI[characterId];
  const toCharacterI = editableTimeline.characterIdToI[toCharacterId];
  assertNonNullable(characterI);
  assertNonNullable(toCharacterI);
  const characterKeyframe = fromKeyframe.characters[characterI];
  const toCharacterKeyframe = fromKeyframe.characters[toCharacterI];
  for (const [participantId, participantKeyframe] of [[characterId, characterKeyframe], [toCharacterId, toCharacterKeyframe]] as const) {
    if (hasActiveItemTransferReservation(participantKeyframe)) {
      errors.addAtLine(`"${participantId}" character is already transferring an item.`, activity.lineI);
      return false;
    }
  }

  // Confirm the giver owns the requested item.
  const ownedItem = findCharacterOwnedItem(characterKeyframe, itemId);
  if (!ownedItem) {
    errors.addAtLine(`"${characterId}" character does not have "${itemId}" so can't give it.`, activity.lineI);
    return false;
  }

  // Confirm both participants are in the same room.
  const room = findRoomAtPosition(level.rooms, characterKeyframe.position.x, characterKeyframe.position.y);
  if (!room) {
    errors.addAtLine(`"${characterId}" character is not placed in a room, so can't give "${itemId}" item.`, activity.lineI);
    return false;
  }
  const toCharacterRoom = findRoomAtPosition(level.rooms, toCharacterKeyframe.position.x, toCharacterKeyframe.position.y);
  if (toCharacterRoom?.id !== room.id) {
    errors.addAtLine(`"${toCharacterId}" character is not in "${room.id}" room with "${characterId}" character, so can't receive "${itemId}" item.`, activity.lineI);
    return false;
  }

  // Move the giver toward the receiver, falling back to the giver's current position in a crowded room.
  let scheduleTime = activity.startTime;
  if (!arePositionsAdjacent(characterKeyframe.position, toCharacterKeyframe.position)) {
    const roomI = editableTimeline.roomIdToI[room.id];
    const claimedWaypoints = findClaimedWaypointsFromKeyframe(room, roomI, fromKeyframe, waypointContext);
    const givePosition = findNearestIncludedFloorWaypointToPosition(waypointContext, room,
      toCharacterKeyframe.position, claimedWaypoints)?.position ?? characterKeyframe.position;
    const scheduleResult = scheduleCharacterMovementWithinRoom(waypointContext, room, characterKeyframe.position,
      scheduleTime, givePosition, characterI, characterKeyframe.facingDirection, editableTimeline);
    if (typeof scheduleResult === 'string') {
      errors.addAtLine(scheduleResult, activity.lineI);
      return false;
    }
    assert(scheduleResult.walkStartDelay === 0);
    scheduleTime += scheduleResult.walkDuration;
  }

  // Re-resolve and validate transfer state after any walk.
  const scheduleKeyframe = findKeyframeForTime(editableTimeline.keyframes, scheduleTime);
  const scheduleCharacterKeyframe = scheduleKeyframe.characters[characterI];
  const scheduleToCharacterKeyframe = scheduleKeyframe.characters[toCharacterI];
  const scheduleOwnedItem = findCharacterOwnedItem(scheduleCharacterKeyframe, itemId);
  if (!scheduleOwnedItem || scheduleOwnedItem.placement !== ownedItem.placement) {
    errors.addAtLine(`"${characterId}" character no longer has "${itemId}" in the same place, so can't give it.`, activity.lineI);
    return false;
  }
  const scheduleRoom = findRoomAtPosition(level.rooms, scheduleCharacterKeyframe.position.x, scheduleCharacterKeyframe.position.y);
  const scheduleToCharacterRoom = findRoomAtPosition(level.rooms, scheduleToCharacterKeyframe.position.x, scheduleToCharacterKeyframe.position.y);
  if (!scheduleRoom || scheduleRoom.id !== scheduleToCharacterRoom?.id) {
    errors.addAtLine(`"${characterId}" and "${toCharacterId}" characters are no longer in the same room, so can't give "${itemId}" item.`, activity.lineI);
    return false;
  }

  // Transfer ownership instantaneously and complete the activity without a visual effect.
  assert(!findCharacterOwnedItem(scheduleToCharacterKeyframe, itemId));
  _scheduleRemoveOwnedItem(scheduleCharacterKeyframe, scheduleOwnedItem.placement,
    itemId, characterI, scheduleTime, editableTimeline);
  addCharacterKeyChanges({ items:[...scheduleToCharacterKeyframe.items, scheduleOwnedItem.item] },
    toCharacterI, scheduleTime, editableTimeline);
  activity.endTime = scheduleTime;
  return true;
}