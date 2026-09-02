/* This file schedules shared spoken-activity behavior for ordinary speech and interruptions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { createSaysEffect } from "@/game/effects/speechEffectUtil";
import Level from "@/game/types/Level";
import Activity from "@/levelLoading/activityLoading/types/Activity";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { addCharacterEffect, addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { findCharacterFacingDirection } from "./facingUtil";
import { calcSpeechDuration, findSpeechConflict } from "./speechUtil";

type SpokenActivityParts = {
  characterId:string,
  text:string,
  toCharacterId?:string,
  verb:'says'|'interrupts'
}

/** Schedules speech timing, facing, conflict validation, and its presentation effect. */
export function scheduleSpokenActivity(level:Level, activity:Activity,
    editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  assertNonNullable(activity.startTime);
  const { characterId, text, toCharacterId, verb } = activity.parts as SpokenActivityParts;
  activity.busyCharacterIds = [characterId];
  const characterI = editableTimeline.characterIdToI[characterId];

  // Face toward an explicit speech target.
  if (toCharacterId) {
    const facingDirection = findCharacterFacingDirection(characterId, toCharacterId, editableTimeline, activity.startTime);
    addCharacterKeyChanges({ facingDirection }, characterI, activity.startTime, editableTimeline);
  }

  // Resolve speech timing and reject overlap unless this activity grants interruption permission.
  const speechDuration = calcSpeechDuration(text);
  activity.endTime = activity.startTime + speechDuration;
  const speechConflictResult = findSpeechConflict(verb, level.rooms, editableTimeline.keyframes,
    characterI, activity.startTime, activity.endTime);
  if (speechConflictResult) {
    errors.addAtLine(speechConflictResult, activity.lineI);
    return false;
  }

  // Interruptions use ordinary speech presentation so they do not grant permission to later speakers.
  const saysEffect = createSaysEffect(characterId, text, activity.startTime, speechDuration);
  addCharacterEffect(saysEffect, characterI, editableTimeline);
  return true;
}