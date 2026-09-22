/* This file parses and schedules audible emissions from characters or items.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeText, makeVariableLiteral, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { assert, assertNonNullable } from "decent-portal";
import { addCharacterEffect } from "@/levelLoading/timelineLoading";
import { calcSpeechDuration } from "./util/speechUtil";
import { createEmitsEffect } from "@/game/effects/speechEffectUtil";
import { findKeyframeForTime } from "@/game/timeline";
import { findRoomIAtPosition } from "@/game/roomUtil";
import EmitSource from "@/game/effects/types/EmitSource";
import { findItemKeyframeLocation } from "./util/itemKeyframeLocationUtil";
import { formatMsecsAsTimestamp } from "../timestampUtil";

/** Creates the accepted syntax for emission activities. */
export function createEmitsParseFormat():ParseFormat {
  const subject = makeOptions([
    makeIdentifier('characterId', 'CharacterId'),
    makeIdentifier('itemId', 'ItemId'),
  ], true);
  const emits = makeVerb('emits');
  const text = makeText();
  const loudly = makeVariableLiteral('isLoud', 'loudly', true);
  const rootParseStep = makeSequence([subject, emits, text, loudly]);
  return createParseFormat(rootParseStep);
}

type PartsShape = {
  characterId:string,
  itemId?:string,
  text:string,
  isLoud?:string
}

function _addSourceError(sourceId:string, text:string, startTime:number, reason:string,
    activity:Activity, errors:ErrorCollector):null {
  errors.addAtLine(`"${sourceId}"${activity.parts.itemId ? ' item' : ''} can't emit "${text}" at `
    + `${formatMsecsAsTimestamp(startTime)} because ${reason}.`, activity.lineI);
  return null;
}

function _createCharacterEmitSource(level:Level, editableTimeline:EditableTimeline, characterId:string,
    text:string, activity:Activity, errors:ErrorCollector):EmitSource|null {
  // Resolve a placed timeline character at the emit start.
  assertNonNullable(activity.startTime);
  const keyframe = findKeyframeForTime(editableTimeline.keyframes, activity.startTime);
  const characterI = editableTimeline.characterIdToI[characterId];
  if (characterI === undefined) {
    return _addSourceError(characterId, text, activity.startTime, 'they are not placed in a room', activity, errors);
  }

  // Require the character to be currently visible and inside a room.
  const character = keyframe.characters[characterI];
  assertNonNullable(character);
  if (!character.isVisible) return _addSourceError(characterId, text, activity.startTime, 'they are not visible', activity, errors);
  if (findRoomIAtPosition(level.rooms, character.position.x, character.position.y) < 0) {
    return _addSourceError(characterId, text, activity.startTime, 'they are not placed in a room', activity, errors);
  }
  return { kind:'character', characterId };
}

function _createItemEmitSource(level:Level, editableTimeline:EditableTimeline, itemId:string,
    text:string, activity:Activity, errors:ErrorCollector):EmitSource|null {
  // Resolve and validate the item's start-time location.
  assertNonNullable(activity.startTime);
  const keyframe = findKeyframeForTime(editableTimeline.keyframes, activity.startTime);
  const location = findItemKeyframeLocation(keyframe, itemId);
  if (!location) return _addSourceError(itemId, text, activity.startTime, 'it is not placed in a room or held by a character', activity, errors);
  if (!location.item.isVisible) return _addSourceError(itemId, text, activity.startTime, 'it is not visible', activity, errors);
  if (location.kind === 'inventory') return _addSourceError(itemId, text, activity.startTime, 'it is in inventory', activity, errors);

  // Capture stable floor or hand placement details.
  if (location.kind === 'room') {
    const room = level.rooms[location.roomI];
    assertNonNullable(room);
    return { kind:'floorItem', itemId, roomId:room.id, roomI:location.roomI, position:location.item.position };
  }
  assert(location.kind === 'leftHand' || location.kind === 'rightHand');
  return {
    kind:'heldItem', itemId, ownerCharacterId:level.characters[location.characterI].id,
    ownerCharacterI:location.characterI, hand:location.kind === 'leftHand' ? 'left' : 'right'
  };
}

/** Schedules an audible emission into an editable timeline. */
export function scheduleEmitsActivity(level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  assertNonNullable(activity.startTime);
  const { characterId, itemId, text, isLoud } = activity.parts as PartsShape;
  const isItemEmitting = itemId !== undefined;
  activity.busyCharacterIds = isItemEmitting ? [] : [characterId];
  activity.busyItemIds = isItemEmitting ? [itemId] : []; // Busy prevents overlapping transfers and transformations; zero-duration visibility changes remain possible.
  const characterI = editableTimeline.characterIdToI[characterId];

  const speechDuration = calcSpeechDuration(text);
  activity.endTime = activity.startTime + speechDuration;

  const source = itemId
    ? _createItemEmitSource(level, editableTimeline, itemId, text, activity, errors)
    : _createCharacterEmitSource(level, editableTimeline, characterId, text, activity, errors);
  if (!source) return false;

  const emitsEffect = createEmitsEffect(source, text, activity.startTime, speechDuration, isLoud !== undefined);
  addCharacterEffect(emitsEffect, characterI, editableTimeline);
  return true;
}