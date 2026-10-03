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
    activity:Activity, errors:ErrorCollector):void {
  errors.addAtLine(`"${sourceId}"${activity.parts.itemId ? ' item' : ''} can't emit "${text}" at `
    + `${formatMsecsAsTimestamp(startTime)} because ${reason}.`, activity.lineI);
}

function _createCharacterEmitSource(characterId:string):EmitSource {
  return { kind:'character', characterId };
}

function _createItemEmitSource(level:Level, editableTimeline:EditableTimeline, itemId:string,
    text:string, activity:Activity, errors:ErrorCollector):EmitSource|null {
  // Resolve and validate the item's start-time location.
  assertNonNullable(activity.startTime);
  const keyframe = findKeyframeForTime(editableTimeline.keyframes, activity.startTime);
  const location = findItemKeyframeLocation(keyframe, itemId);
  if (!location) {
    _addSourceError(itemId, text, activity.startTime, 'it is not placed in a room or held by a character', activity, errors);
    return null;
  }
  if (location.kind === 'inventory') {
    _addSourceError(itemId, text, activity.startTime, 'it is in inventory', activity, errors);
    return null;
  }

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
    : _createCharacterEmitSource(characterId);
  if (!source) return false;

  const emitsEffect = createEmitsEffect(source, text, activity.startTime, speechDuration, isLoud !== undefined);
  addCharacterEffect(emitsEffect, characterI, editableTimeline);
  return true;
}