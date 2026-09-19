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

type SpokenActivityParts = {
  characterId:string,
  text:string,
  toCharacterId?:string
}

/** Schedules speech timing, facing, and its presentation effect. */
export function scheduleSpokenActivity(_level:Level, activity:Activity,
    editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  assertNonNullable(activity.startTime);
  const { characterId, text, toCharacterId } = activity.parts as SpokenActivityParts;
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  const characterI = editableTimeline.characterIdToI[characterId];

  // Face toward an explicit speech target.
  if (toCharacterId) {
    const facingDirection = findCharacterFacingDirection(characterId, toCharacterId, editableTimeline, activity.startTime);
    addCharacterKeyChanges({ facingDirection }, characterI, activity.startTime, editableTimeline);
  }

  // Resolve speech timing before creating its presentation effect.
  const speechDuration = calcSpeechDuration(text);
  activity.endTime = activity.startTime + speechDuration;

  const saysEffect = createSaysEffect(characterId, text, activity.startTime, speechDuration);
  addCharacterEffect(saysEffect, characterI, editableTimeline);
  return true;
}