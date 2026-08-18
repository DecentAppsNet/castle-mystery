import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { assert, assertNonNullable } from "decent-portal";
import { findKeyframeForTime } from "@/game/timeline";
import { findRoomIdAtPosition } from "@/game/roomUtil";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findClaimedWaypointsFromKeyframe, findNearestIncludedFloorBackRowWaypointToPosition, findNearestIncludedFloorWaypointToPosition, findRoomWaypointAtPosition } from "../waypointFindingUtil";
import { formatMsecsAsTimestamp } from "../timestampUtil";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import Item, { duplicateItem } from "@/game/types/Item";
import Position from "@/game/types/Position";
import Rect from "@/game/types/Rect";
import { isPositionInRect } from "@/game/rectUtil";
import Room from "@/game/types/Room";
import Waypoint from "@/levelLoading/types/Waypoint";
import { arePositionsAdjacent } from "@/game/positionUtil";
import { scheduleCharacterMovementWithinRoom } from "../movementPlanningUtil";
import { addCharacterKeyframe, addRoomKeyframe } from "@/levelLoading/timelineLoading";
import RoomKeyframe from "@/game/types/RoomKeyframe";
import DropCue, { DROP_EFFECT_TIME } from "@/game/types/effectCues/DropCue";

// Coupled to parse format. Used for casting parts to expected types.
type PartsShape = {
  characterId:string,
  itemId:string,
  toCharacterId?:string,
  toItemId?:string
}

export function createDropsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const drops = makeVerb('drops');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const preposition = makeOptions([
    makeLiteral('at'),
    makeLiteral('on'),
    makeLiteral('onto'),
    makeLiteral('to'),
  ]);
  const targetOptions = makeOptions([
    makeIdentifier('toItemId', 'ItemId'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ]);
  const target = makeSequence([preposition, targetOptions], true);
  const rootParseStep = makeSequence([characterId, drops, itemId, target]);
  return createParseFormat(rootParseStep);
}

function _findCharacterItem(characterKeyframe:CharacterKeyframe, itemId:string):Item|null {
  if (characterKeyframe.leftHandItem?.id === itemId) return characterKeyframe.leftHandItem;
  if (characterKeyframe.rightHandItem?.id === itemId) return characterKeyframe.rightHandItem;
  return characterKeyframe.items.find(i => i.id === itemId) ?? null;
}

function _findItemPositionInRoom(itemId:string|undefined, roomId:string, roomItems:Item[]):Position|string|null {
  if (!itemId) return null;
  const item = roomItems.find(i => i.id === itemId);
  if (!item) return `"${itemId}" item is not in "${roomId}" room.`;
  return item.position;
}

function _findCharacterPosition(characterId:string|undefined, roomId:string, keyframe:TimelineKeyframe, 
    characterIdToI:{[characterId:string]:number}, roomRect:Rect):Position|string|null {
  if (!characterId) return null;
  const characterI = characterIdToI[characterId];
  const characterKeyframe = keyframe.characters[characterI];
  assertNonNullable(characterKeyframe);
  const { x, y } = characterKeyframe.position;
  if (!isPositionInRect(x, y, roomRect)) return `"${characterId}" character is not in "${roomId}" room.`;
  return characterKeyframe.position;
}

function _findDropInRoomPosition(baseRoom:Room, claimedWaypoints:Waypoint[],
    waypointContext:WaypointGenerationContext, characterPosition:Position):Position {
  // Try to drop item in back row...
  const targetWaypoint = findNearestIncludedFloorBackRowWaypointToPosition(waypointContext, baseRoom, characterPosition, claimedWaypoints) 
    // But if no unclaimed waypoint found, relax criteria...
    ?? findNearestIncludedFloorWaypointToPosition(waypointContext, baseRoom, characterPosition, claimedWaypoints);
  return targetWaypoint?.position 
    // And failing that, (crowded room) I can drop the item at character's feet.
    ?? characterPosition;
}

function _findDropAdjacentPosition(baseRoom:Room, claimedWaypoints:Waypoint[], waypointContext:WaypointGenerationContext, dropPosition:Position):Position {
  const dropWaypoint = findRoomWaypointAtPosition(waypointContext, baseRoom.id, dropPosition);
  assertNonNullable(dropWaypoint);
  claimedWaypoints.push(dropWaypoint);
  const targetWaypoint = findNearestIncludedFloorWaypointToPosition(waypointContext, baseRoom, dropPosition, claimedWaypoints);
  return targetWaypoint?.position ?? dropPosition;
}

function _scheduleRemoveItemFromCharacter(characterKeyframe:CharacterKeyframe, characterI:number, time:number, itemId:string, editableTimeline:EditableTimeline) {
  const keyChanges:Partial<CharacterKeyframe> = {};
  if (characterKeyframe.leftHandItem?.id === itemId) keyChanges.leftHandItem = null;
  if (characterKeyframe.rightHandItem?.id === itemId) keyChanges.rightHandItem = null;
  const items = characterKeyframe.items.filter(i => i.id !== itemId);
  if (items.length !== characterKeyframe.items.length) keyChanges.items = items;
  addCharacterKeyframe(keyChanges, characterI, time, editableTimeline);
}

function _scheduleAddItemToRoom(dropItem:Item, dropPosition:Position, roomKeyframe:RoomKeyframe, roomI:number, time:number, editableTimeline:EditableTimeline) {
  assert(!roomKeyframe.items.find(i => i.id === dropItem.id));
  const item:Item = { ...duplicateItem(dropItem), position:dropPosition };
  const items = [ ...roomKeyframe.items, item ];
  addRoomKeyframe({ items }, roomI, time, editableTimeline);
}

export function scheduleDropsActivity(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  
  // Get keyframe and set up convenience vars for character.
  assertNonNullable(activity.startTime);
  const { characterId, itemId, toItemId, toCharacterId } = activity.parts as PartsShape;
  const fromKeyframe = findKeyframeForTime(editableTimeline.keyframes, activity.startTime);
  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  const characterKeyframe = fromKeyframe.characters[characterI];

  // Confirm character has item in inventory or hands at time of dropping.
  const item = _findCharacterItem(characterKeyframe, itemId);
  if (!item) {
    errors.addAtLine(`"${characterId}" character does not have "${itemId}" at ${formatMsecsAsTimestamp(activity.startTime)} so can't drop it.`,
      activity.lineI);
    return false;
  }

  // Set up convenience vars for room.
  const roomId = findRoomIdAtPosition(level.rooms, characterKeyframe.position.x, characterKeyframe.position.y);
  assertNonNullable(roomId);
  const roomI = editableTimeline.roomIdToI[roomId];
  const roomKeyframe = fromKeyframe.rooms[roomI];
  const baseRoom = level.rooms.find(r => r.id === roomId);
  assertNonNullable(baseRoom);

  // Find the right place to drop the item.
  const claimedWaypoints = findClaimedWaypointsFromKeyframe(baseRoom, roomI, fromKeyframe, waypointContext);
  const dropPositionResult:Position|string = _findItemPositionInRoom(toItemId, roomId, roomKeyframe.items) ??
      _findCharacterPosition(toCharacterId, roomId, fromKeyframe, editableTimeline.characterIdToI, baseRoom.rect) ??
      _findDropInRoomPosition(baseRoom, claimedWaypoints, waypointContext, characterKeyframe.position);
  if (typeof dropPositionResult === 'string') {
    errors.addAtLine(dropPositionResult, activity.lineI);
    return false;
  }

  // Schedule moving the character closer to the drop position if needed.
  let scheduleTime = activity.startTime;
  if (!arePositionsAdjacent(dropPositionResult, characterKeyframe.position)) {
    const dropAdjacentPosition = _findDropAdjacentPosition(baseRoom, claimedWaypoints, waypointContext, dropPositionResult);
    const scheduleResult = scheduleCharacterMovementWithinRoom(waypointContext, baseRoom, characterKeyframe.position, scheduleTime, 
        dropAdjacentPosition, characterI, characterKeyframe.facingDirection, editableTimeline);
    if (typeof scheduleResult === 'string') {
      errors.addAtLine(scheduleResult, activity.lineI);
      return false;
    }
    scheduleTime = scheduleResult;
  }
  
  // Schedule removal of item from character and adding it to the room in its target position.
  _scheduleRemoveItemFromCharacter(characterKeyframe, characterI, scheduleTime, itemId, editableTimeline);
  _scheduleAddItemToRoom(item, dropPositionResult, roomKeyframe, roomI, scheduleTime, editableTimeline);

  // Add cue for dropping effect.
  const dropCue:DropCue = { kind:'dropItem', itemId, targetPosition:dropPositionResult };
  addCharacterKeyframe({ effectCues:[dropCue] }, characterI, scheduleTime, editableTimeline);
  activity.endTime = scheduleTime + DROP_EFFECT_TIME;

  return true;
}