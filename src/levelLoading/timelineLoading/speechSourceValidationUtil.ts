/* This file validates speech sources against their completed start-time timeline state.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { findKeyframeForTime } from "@/game/timeline";
import { findRoomIAtPosition } from "@/game/roomUtil";
import Level from "@/game/types/Level";
import Activity from "../activityLoading/types/Activity";
import { findItemKeyframeLocation } from "../activityLoading/activitySchedulers/util/itemKeyframeLocationUtil";
import { verbToPlainForm } from "../activityLoading/parseFormatUtil";
import { formatMsecsAsTimestamp } from "../activityLoading/timestampUtil";
import ErrorCollector from "../errorCollection/ErrorCollector";
import EditableTimeline from "./types/EditableTimeline";

type SpeechParts = { characterId?:string, itemId?:string, text:string };

function _isSpeechActivity(activity:Activity):boolean {
  return activity.verb === 'says' || activity.verb === 'thinks' || activity.verb === 'emits';
}

function _addSpeechSourceError(activity:Activity, sourceId:string, isItem:boolean,
    reason:string, errors:ErrorCollector):void {
  assertNonNullable(activity.startTime);
  const { text } = activity.parts as SpeechParts;
  errors.addAtLine(`"${sourceId}"${isItem ? ' item' : ''} can't ${verbToPlainForm(activity.verb)} "${text}" at `
    + `${formatMsecsAsTimestamp(activity.startTime)} because ${reason}.`, activity.lineI);
}

/** Rejects unplaced character speech before schedulers require a timeline character index. */
export function validateSpeechSourceBeforeScheduling(activity:Activity, timeline:EditableTimeline,
    errors:ErrorCollector):boolean {
  if (!_isSpeechActivity(activity)) return true;
  const { characterId, itemId } = activity.parts as SpeechParts;
  if (itemId) return true;

  assertNonNullable(characterId);
  if (timeline.characterIdToI[characterId] !== undefined) return true;
  _addSpeechSourceError(activity, characterId, false, 'they are not placed in a room', errors);
  return false;
}

function _findCharacterInvalidReason(level:Level, timeline:EditableTimeline,
    characterId:string, startTime:number):string|null {
  const characterI = timeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  const character = findKeyframeForTime(timeline.keyframes, startTime).characters[characterI];
  if (!character.isVisible) return 'they are not visible';
  return findRoomIAtPosition(level.rooms, character.position.x, character.position.y) < 0
    ? 'they are not placed in a room' : null;
}

function _findItemInvalidReason(timeline:EditableTimeline, itemId:string, startTime:number):string|null {
  const location = findItemKeyframeLocation(findKeyframeForTime(timeline.keyframes, startTime), itemId);
  if (!location) return 'it is not placed in a room or held by a character';
  if (!location.item.isVisible) return 'it is not visible';
  return location.kind === 'inventory' ? 'it is in inventory' : null;
}

function _validateSpeechSource(level:Level, activity:Activity, timeline:EditableTimeline,
    errors:ErrorCollector):void {
  const { characterId, itemId } = activity.parts as SpeechParts;
  assertNonNullable(activity.startTime);
  const sourceId = itemId ?? characterId;
  assertNonNullable(sourceId);
  const reason = itemId
    ? _findItemInvalidReason(timeline, itemId, activity.startTime)
    : _findCharacterInvalidReason(level, timeline, sourceId, activity.startTime);
  if (!reason) return;

  _addSpeechSourceError(activity, sourceId, itemId !== undefined, reason, errors);
}

/** Reports invalid says, thinks, and emits sources in their completed start-time states. */
export function validateSpeechSources(level:Level, activities:readonly Activity[], timeline:EditableTimeline,
    errors:ErrorCollector):void {
  activities.filter(_isSpeechActivity)
    .forEach(activity => _validateSpeechSource(level, activity, timeline, errors));
}