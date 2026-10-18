/* This file schedules shared ordinary spoken-activity behavior.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { createSaysEffect } from "@/game/effects/speechEffectUtil";
import Level from "@/game/types/Level";
import Activity from "@/levelLoading/activityLoading/types/Activity";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { addCharacterEffect, addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { findCharacterFacingDirection } from "./facingUtil";
import { calcSpeechDuration } from "./speechUtil";
import { prepareSpeechText } from "./speechTextPreparationUtil";

type SpokenActivityParts = {
  characterId:string,
  text:string,
  toCharacterId?:string
}

/** Schedules speech timing, facing, and its presentation effect. */
export function scheduleSpokenActivity(_level:Level, activity:Activity,
    editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  assertNonNullable(activity.startTime);
  const { characterId, text, toCharacterId } = activity.parts as SpokenActivityParts;
  const preparedText = prepareSpeechText(text, activity, errors);
  if (!preparedText) return false;
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);

  // Face toward an explicit speech target.
  if (toCharacterId) {
    const facingDirection = findCharacterFacingDirection(characterId, toCharacterId, editableTimeline, activity.startTime);
    addCharacterKeyChanges({ facingDirection }, characterI, activity.startTime, editableTimeline);
  }

  // Resolve speech timing before creating its presentation effect.
  const speechDuration = calcSpeechDuration(preparedText.plainText);
  activity.endTime = activity.startTime + speechDuration;

  const saysEffect = createSaysEffect(characterId, preparedText, activity.startTime, speechDuration);
  addCharacterEffect(saysEffect, characterI, editableTimeline);
  return true;
}