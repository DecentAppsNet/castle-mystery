import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteralOptions, makeSequence, makeVariableLiteralOptions, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { assert, assertNonNullable } from "decent-portal";
import { findRoomAtPosition } from "@/game/roomUtil";
import { createKeyframeAtTime } from "@/game/timeline";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import Item from "@/game/types/Item";
import RoomKeyframe from "@/game/types/RoomKeyframe";
import Waypoint from "@/levelLoading/types/Waypoint";
import { findClaimedWaypointsFromKeyframe, findNearestFloorWaypointToPosition, findNearestIncludedFloorWaypointToPosition, findRoomWaypointAtPosition } from "../waypointFindingUtil";
import Room from "@/game/types/Room";
import { scheduleCharacterMovementWithinRoom } from "../movementPlanningUtil";
import TakeCue, { INVENTORY, LEFT_HAND, RIGHT_HAND, TAKE_EFFECT_TIME } from "@/game/types/effectCues/TakeCue";
import { addCharacterEffectCue, addCharacterKeyChanges, addRoomKeyChanges } from "@/levelLoading/timelineLoading";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";

const ROOM = 'room';

function _getItemPlacement(characterKeyframe:CharacterKeyframe, itemId:string):string {
  if (characterKeyframe.leftHandItem?.id === itemId) return LEFT_HAND;
  if (characterKeyframe.rightHandItem?.id === itemId) return RIGHT_HAND;
  if (characterKeyframe.items.find(i => i.id === itemId) !== undefined) return INVENTORY;
  return ROOM;
}

function _scheduleCharacterItemMovement(keyframe:CharacterKeyframe, item:Item, itemPlacement:string, target:string, characterI:number, 
    time:number, editableTimeline:EditableTimeline) {
  if (target === itemPlacement) return; // Item is already where it was requested to be.

  const nextKeyframe:Partial<CharacterKeyframe> = {};
  switch(target) {
    case LEFT_HAND:
      if (keyframe.leftHandItem !== null) nextKeyframe.items = [...keyframe.items, keyframe.leftHandItem]; // Move current in-hand item to inventory.
      nextKeyframe.leftHandItem = item;
    break;
    
    case RIGHT_HAND:
      if (keyframe.rightHandItem !== null) nextKeyframe.items = [...keyframe.items, keyframe.rightHandItem]; // Move current in-hand item to inventory.
      nextKeyframe.rightHandItem = item;
    break;

    default: // Either "inventory" or omitted, in which case, default is inventory.
      nextKeyframe.items = [...keyframe.items, item];
  }

  switch(itemPlacement) {
    case LEFT_HAND: 
      nextKeyframe.leftHandItem = null;
    break;

    case RIGHT_HAND:
      nextKeyframe.rightHandItem = null;
    break;

    case INVENTORY:
      const sourceItems = nextKeyframe.items ?? keyframe.items; // If previous code put something into inventory, retain that addition.
      nextKeyframe.items = sourceItems.filter(i => i.id !== item.id);
    break;

    default:
      assert(itemPlacement === ROOM); // removal from room handled elsewhere.
  }

  addCharacterKeyChanges(nextKeyframe, characterI, time, editableTimeline);
}

function _isItemInRoom(roomKeyframe:RoomKeyframe, itemId:string):boolean {
  return roomKeyframe.items.find(i => i.id === itemId) !== undefined;
}

function _scheduleRemoveItemFromRoom(room:RoomKeyframe, itemId:string, roomI:number, time:number, editableTimeline:EditableTimeline) {
  const items = room.items.filter(i => i.id !== itemId);
  addRoomKeyChanges({ items }, roomI, time, editableTimeline);
}

export function createTakesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const takes = makeVerb('takes');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const preposition = makeLiteralOptions(['in', 'into']);
  const target = makeVariableLiteralOptions('target', [LEFT_HAND, RIGHT_HAND, INVENTORY]);
  const targetSequence = makeSequence([preposition, target], true);
  const rootParseStep = makeSequence([characterId, takes, itemId, targetSequence]);
  return createParseFormat(rootParseStep);
}

function _findBestTakeWaypoint(context:WaypointGenerationContext, keyframe:TimelineKeyframe, room:Room, roomI:number, item:Item):Waypoint {
  const claimedWaypoints = findClaimedWaypointsFromKeyframe(room, roomI, keyframe, context);
  
  const bestWaypoint = findNearestIncludedFloorWaypointToPosition(context, room, item.position, claimedWaypoints) ??
    findRoomWaypointAtPosition(context, room.id, item.position);
  assertNonNullable(bestWaypoint);
  return bestWaypoint;
}

export function scheduleTakesActivity(level:Level, waypointContext:WaypointGenerationContext,
  activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  assertNonNullable(activity.startTime);
  
  const { characterId, itemId } = activity.parts;
  const target:string = typeof activity.parts.target === 'string' ? activity.parts.target : INVENTORY;
  assert(target === LEFT_HAND || target === RIGHT_HAND || target === INVENTORY);

  assertNonNullable(characterId, 'implied subjects should have been resolved');
  assert(typeof itemId === 'string');
  const keyframe = createKeyframeAtTime(editableTimeline.keyframes, activity.startTime);
  const characterI = editableTimeline.characterIdToI[characterId];
  const characterKeyframe = keyframe.characters[characterI];
  assertNonNullable(characterKeyframe);
  const item = level.itemsById.get(itemId);
  assertNonNullable(item);

  const itemPlacement = _getItemPlacement(characterKeyframe, itemId);
  if (itemPlacement !== ROOM) { // Handle movement of item from one place on the character to another.
    _scheduleCharacterItemMovement(characterKeyframe, item, itemPlacement, target, characterI, activity.startTime, editableTimeline);
    activity.endTime = activity.startTime;
    return true;
  }

  // Item isn't on character, so find it in room.
  const characterRoom = findRoomAtPosition(level.rooms, characterKeyframe.position.x, characterKeyframe.position.y);
  if (!characterRoom) {
    errors.addAtLine(`"${characterId}" character is not placed in a room, so can't take "${itemId}" item.`, activity.lineI);
    return false;
  }
  const roomI = editableTimeline.roomIdToI[characterRoom.id];
  const roomKeyframe = keyframe.rooms[roomI];
  assertNonNullable(roomKeyframe);
  if (!_isItemInRoom(roomKeyframe, itemId)) {
    errors.addAtLine(`"${itemId}" item is not in "${characterRoom.id}" room with "${characterId}" character, so can't be taken.`, activity.lineI);
    return false;
  }

  // Move character close to item to take it.
  let scheduleTime = activity.startTime;
  const characterWaypoint = findNearestFloorWaypointToPosition(waypointContext, characterRoom, characterKeyframe.position);
  assertNonNullable(characterWaypoint);
  const takeWaypoint = _findBestTakeWaypoint(waypointContext, keyframe, characterRoom, roomI, item);
  const scheduleResult = scheduleCharacterMovementWithinRoom(waypointContext, characterRoom, characterKeyframe.position, scheduleTime, takeWaypoint.position,
    characterI, characterKeyframe.facingDirection, editableTimeline);
  if (typeof scheduleResult === 'string') {
    errors.addAtLine(scheduleResult, activity.lineI);
    return false;
  }
  assert(scheduleResult.walkStartDelay === 0);
  scheduleTime += scheduleResult.walkDuration;

  _scheduleRemoveItemFromRoom(roomKeyframe, itemId, roomI, scheduleTime, editableTimeline);
  _scheduleCharacterItemMovement(characterKeyframe, item, itemPlacement, target, characterI, scheduleTime, editableTimeline);

  const takeCue:TakeCue = { kind:'takeItem', itemId, target, startTime:scheduleTime, endTime:scheduleTime + TAKE_EFFECT_TIME };
  addCharacterEffectCue(takeCue, characterI, editableTimeline);
  activity.endTime = takeCue.endTime;

  return true;
}