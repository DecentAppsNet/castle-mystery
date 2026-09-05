/* This file parses and schedules item transformation activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { findKeyframeForTime } from "@/game/timeline";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import Item, { duplicateItem } from "@/game/types/Item";
import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import RoomKeyframe from "@/game/types/RoomKeyframe";
import { addCharacterKeyChanges, addRoomKeyChanges } from "@/levelLoading/timelineLoading";
import Character from "@/game/types/Character";
import Room from "@/game/types/Room";

type PartsShape = { itemId:string, toItemId:string };

type ItemKeyframeLocation = {
  kind:'inventory'|'leftHand'|'rightHand',
  item:Item,
  characterI:number
} | {
  kind:'room',
  item:Item,
  roomI:number
}

function _findItemInKeyframe(keyframe:TimelineKeyframe, itemId:string):ItemKeyframeLocation|null {
  for(let roomI = 0; roomI < keyframe.rooms.length; ++roomI) {
    const item = keyframe.rooms[roomI].items.find(i => i.id === itemId);
    if (item) return { kind:'room', item, roomI }
  }
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    const ckf = keyframe.characters[characterI];
    if (ckf.leftHandItem?.id === itemId) return { kind:'leftHand', item:ckf.leftHandItem, characterI };
    if (ckf.rightHandItem?.id === itemId) return { kind:'rightHand', item:ckf.rightHandItem, characterI };
    const item = ckf.items.find(i => i.id === itemId) ;
    if (item) return { kind:'inventory', item, characterI };
  }
  return null;
}

function _describeItemLocation(location:ItemKeyframeLocation, characters:Character[], rooms:Room[]):string {
  if (location.kind === 'room') {
    const roomId:string = rooms[location.roomI].id;
    return `in "${roomId}" room`;
  }
  const characterId:string = characters[location.characterI].id;
  if (location.kind === 'leftHand') return `in ${characterId}'s left hand`;
  if (location.kind === 'rightHand') return `in ${characterId}'s right hand`;
  assert(location.kind === 'inventory');
  return `in ${characterId}'s inventory`;
}

function _createBecomesItem(fromItem:Item, toItem:Item):Item {
  return { ...duplicateItem(toItem), position:fromItem.position };
}

function _createRoomItemReplacementChanges(keyframe:TimelineKeyframe, fromLocation:ItemKeyframeLocation, fromItemId:string, becomesItem:Item):Partial<RoomKeyframe> {
  assert(fromLocation.kind === 'room');
  const roomKeyframe = keyframe.rooms[fromLocation.roomI];
  assertNonNullable(roomKeyframe);
  const items = roomKeyframe.items.map(i => i.id === fromItemId ? becomesItem : i);
  return { items };
}

function _createCharacterItemReplacementChanges(keyframe:TimelineKeyframe, fromLocation:ItemKeyframeLocation, fromItemId:string, becomesItem:Item):Partial<CharacterKeyframe> {
  assert(fromLocation.kind !== 'room');
  if (fromLocation.kind === 'leftHand') return { leftHandItem:becomesItem };
  if (fromLocation.kind === 'rightHand') return { rightHandItem:becomesItem };
  assert(fromLocation.kind === 'inventory');
  const characterKeyframe = keyframe.characters[fromLocation.characterI];
  assertNonNullable(characterKeyframe);
  const items = characterKeyframe.items.map(i => i.id === fromItemId ? becomesItem : i);
  return { items };
}

/** Creates the accepted syntax for item transformation activities. */
export function createBecomesParseFormat():ParseFormat {
  const itemId = makeIdentifier('itemId', 'ItemId');
  const becomes = makeVerb('becomes');
  const toItemId = makeIdentifier('toItemId', 'ItemId');
  const rootParseStep = makeSequence([itemId, becomes, toItemId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an item transformation activity into an editable timeline. */
export function scheduleBecomesActivity(level:Level, _waypointContext:WaypointGenerationContext, 
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  
  const { itemId, toItemId } = activity.parts as PartsShape;
  activity.busyCharacterIds = [];
  activity.busyItemIds = [itemId, toItemId];
  activity.endTime = activity.startTime;

  if (itemId === toItemId) {
    errors.addAtLine(`Can't have "${itemId}" become itself.`, activity.lineI);
    return false;
  }

  assertNonNullable(activity.startTime);
  assert(Object.keys(editableTimeline.roomIdToI).length === level.rooms.length);
  assert(Object.keys(editableTimeline.characterIdToI).length === level.characters.length);
  const keyframe = findKeyframeForTime(editableTimeline.keyframes, activity.startTime);
  const fromLocation = _findItemInKeyframe(keyframe, itemId);
  const toLocation = _findItemInKeyframe(keyframe, toItemId);
  if (!fromLocation) {
    errors.addAtLine(`"${itemId}" item can't become "${toItemId}" because "${itemId}" isn't placed in a room or on a character.`, activity.lineI);
    return false;
  }
  if (toLocation) {
    const toLocationDescription = _describeItemLocation(toLocation, level.characters, level.rooms);
    errors.addAtLine(`"${itemId}" item can't become "${toItemId}" because "${toItemId}" is already placed ${toLocationDescription}.`, activity.lineI);
  }

  const toItem = level.itemsById.get(toItemId);
  assertNonNullable(toItem);
  const becomesItem = _createBecomesItem(fromLocation.item, toItem);

  if (fromLocation.kind === 'room') {
    const keyChanges = _createRoomItemReplacementChanges(keyframe, fromLocation, itemId, becomesItem);
    addRoomKeyChanges(keyChanges, fromLocation.roomI, activity.startTime, editableTimeline);
  } else {
    const keyChanges = _createCharacterItemReplacementChanges(keyframe, fromLocation, itemId, becomesItem);
    addCharacterKeyChanges(keyChanges, fromLocation.characterI, activity.startTime, editableTimeline);
  }
  return true;
}