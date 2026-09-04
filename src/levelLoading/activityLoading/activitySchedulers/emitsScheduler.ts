/* This file parses and schedules audible emissions from characters or items.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeText, makeVariableLiteral, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { assertNonNullable } from "decent-portal";
import { addCharacterEffect } from "@/levelLoading/timelineLoading";
import { calcSpeechDuration, findSpeechConflict } from "./util/speechUtil";
import { createEmitsEffect } from "@/game/effects/speechEffectUtil";

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
  verb:'emits',
  isLoud?:string
}

/** Schedules an audible emission into an editable timeline. */
export function scheduleEmitsActivity(level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  assertNonNullable(activity.startTime);
  const { characterId, itemId, text, verb, isLoud } = activity.parts as PartsShape;
  const isItemEmitting = itemId !== undefined;
  activity.busyCharacterIds = isItemEmitting ? [] : [characterId];
  activity.busyItemIds = isItemEmitting ? [itemId] : []; // Busy because a "becomes" or "hide" activity might remove/hide the item while it is depicted as source of audio.
  const characterI = editableTimeline.characterIdToI[characterId];

  const speechDuration = calcSpeechDuration(text);
  activity.endTime = activity.startTime + speechDuration;

  const speechConflictResult = findSpeechConflict(verb, level.rooms, editableTimeline.keyframes,
    characterI, activity.startTime, activity.endTime);
  if (speechConflictResult) {
    errors.addAtLine(speechConflictResult, activity.lineI);
    return false;
  }

  // TODO this is missing any handling for an emit bubble showing over an item instead of a character.
  const emitsEffect = createEmitsEffect(characterId, text, activity.startTime, speechDuration, isLoud !== undefined);
  addCharacterEffect(emitsEffect, characterI, editableTimeline);
  return true;
}