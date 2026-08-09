import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteralOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading2/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading2/errorCollection";
import { assert, assertNonNullable } from "decent-portal";
import { findRoomAtPosition } from "@/game/roomUtil";
import { addCharacterKeyframe, addRoomKeyframe, createCharacterSnapshotAtTime } from "@/levelLoading2/timelineLoading";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import Item from "@/game/types/Item";
import { findRoomKeyframeForTime } from "@/levelLoading2/timelineLoading/retrievalUtil";
import RoomKeyframe from "@/game/types/RoomKeyframe";
import Waypoint from "@/game/types/Waypoint";
import { findNearestFloorWaypointToPosition, isExitWaypoint, isFloorWaypoint } from "../waypointFindingUtil";
import { arePositionsOrthogonal } from "@/game/types/Position";
import Room from "@/game/types/Room";
import { scheduleCharacterMovementWithinRoom } from "../movementPlanningUtil";

const LEFT_HAND = 'left hand', RIGHT_HAND = 'right hand', INVENTORY = 'inventory', ROOM = 'room';
const TAKE_EFFECT_TIME = 1000;

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
      nextKeyframe.items = keyframe.items.filter(i => i.id !== item.id);
    break;

    // ROOM placement isn't handled here.
  }

  addCharacterKeyframe(nextKeyframe, characterI, time, editableTimeline);
}

function _isItemInRoom(roomKeyframe:RoomKeyframe, itemId:string):boolean {
  return roomKeyframe.items.find(i => i.id === itemId) !== undefined;
}

function _scheduleRemoveItemFromRoom(room:RoomKeyframe, itemId:string, roomI:number, time:number, editableTimeline:EditableTimeline) {
  const items = room.items.filter(i => i.id !== itemId);
  addRoomKeyframe({ items }, roomI, time, editableTimeline);
}

export function createTakesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const takes = makeVerb('takes');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const preposition = makeLiteralOptions(['in', 'into']);
  const target = makeLiteralOptions([LEFT_HAND, RIGHT_HAND, INVENTORY]);
  const targetSequence = makeSequence([preposition, target], true);
  const rootParseStep = makeSequence([characterId, takes, itemId, targetSequence]);
  return createParseFormat(rootParseStep);
}

function _scoreTakeWaypoint(item:Item, waypoint:Waypoint):number {
  let score = 0;
  if (arePositionsOrthogonal(item.position, waypoint.position)) score += 1000;
  if (waypoint.position.z > item.position.z) score += 500;
  score += 100 - Math.hypot(item.position.x - waypoint.position.x, item.position.z - waypoint.position.z);
  return score;
}

function _findBestTakeWaypoint(room:Room, characterWaypoint:Waypoint, item:Item):Waypoint {
  let bestScore = -Infinity;
  let bestWaypoint:Waypoint = characterWaypoint;
  room.waypoints.forEach(waypoint => {
    if (waypoint === characterWaypoint || isExitWaypoint(room, waypoint) || !isFloorWaypoint(room, waypoint)) return;
    const score = _scoreTakeWaypoint(item, waypoint);
    if (score > bestScore) {
      bestWaypoint = waypoint;
      bestScore = score;
    }
  });
  return bestWaypoint;
}

export function scheduleTakesActivity(level:Level, 
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  assertNonNullable(activity.startTime);
  
  const { characterId, itemId } = activity.parts;
  const target:string = typeof activity.parts.target === 'string' ? activity.parts.target : INVENTORY;

  assertNonNullable(characterId, 'implied subjects should have been resolved');
  assert(typeof itemId === 'string');
  const characterI = editableTimeline.characterIdToI[characterId];
  const character = createCharacterSnapshotAtTime(editableTimeline.keyframes, characterI, activity.startTime);
  assertNonNullable(character);
  const item = level.itemsById.get(itemId);
  assertNonNullable(item);

  const itemPlacement = _getItemPlacement(character, itemId);
  if (itemPlacement !== ROOM) { // Handle movement of item from one place on the character to another.
    _scheduleCharacterItemMovement(character, item, itemPlacement, target, characterI, activity.startTime, editableTimeline);
    activity.endTime = activity.startTime;
    return true;
  }

  // Item isn't on character, so find it in room.
  const characterRoom = findRoomAtPosition(level.rooms, character.position.x, character.position.y);
  if (!characterRoom) {
    errors.addAt(`"${characterId}" character is not placed in a room, so can't take "${itemId}" item.`, 'itinerary');
    return false;
  }

  const roomI = editableTimeline.roomIdToI[characterRoom.id];
  assertNonNullable(roomI);
  const roomKeyframe = findRoomKeyframeForTime(editableTimeline.keyframes, roomI, activity.startTime);
  if (!_isItemInRoom(roomKeyframe, itemId)) {
    errors.addAt(`"${itemId}" item is not in "${characterRoom.id}" room with "${characterId}" character, so can't be taken.`, 'itinerary');
    return false;
  }

  // Move character close to item to take it.
  let scheduleTime = activity.startTime;
  const characterWaypoint = findNearestFloorWaypointToPosition(characterRoom, character.position);
  assertNonNullable(characterWaypoint);
  const takeWaypoint = _findBestTakeWaypoint(characterRoom, characterWaypoint, item);
  const scheduleResult = scheduleCharacterMovementWithinRoom(characterRoom, character.position, scheduleTime, takeWaypoint.position,
    characterI, editableTimeline);
  if (typeof scheduleResult === 'string') {
    errors.addAt(scheduleResult, 'itinerary');
    return false;
  }
  scheduleTime = scheduleResult;

  _scheduleRemoveItemFromRoom(roomKeyframe, itemId, roomI, scheduleTime, editableTimeline);
  _scheduleCharacterItemMovement(character, item, itemPlacement, target, characterI, scheduleTime, editableTimeline);

  // TODO - add effect to timeline. (Needs some design.)
  activity.endTime = scheduleTime + TAKE_EFFECT_TIME;

  return true;
}