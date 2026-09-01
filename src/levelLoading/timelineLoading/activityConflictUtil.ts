/* This file detects overlapping loading-time activities that make the same character busy.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Activity from "../activityLoading/types/Activity";

/** A prior activity that overlaps the current activity through a shared busy character. */
export type CharacterActivityConflict = {
  characterId:string,
  activity:Activity
};

function _findSharedCharacterId(firstCharacterIds:readonly string[],
    secondCharacterIds:readonly string[]):string|null {
  return firstCharacterIds.find(characterId => secondCharacterIds.includes(characterId)) ?? null;
}

function _activitiesOverlap(firstStartTime:number, firstEndTime:number,
    secondStartTime:number, secondEndTime:number):boolean {
  if (firstStartTime === firstEndTime || secondStartTime === secondEndTime) return false;
  return firstStartTime < secondEndTime && secondStartTime < firstEndTime;
}

/** Returns the first prior overlapping activity and shared busy character. */
export function findConflictingCharacterActivity(activity:Activity,
    scheduledActivities:readonly Activity[]):CharacterActivityConflict|null {
  // Validate the current activity contract supplied by successful scheduling.
  assertNonNullable(activity.startTime);
  assertNonNullable(activity.endTime);
  assertNonNullable(activity.busyCharacterIds);
  assert(Number.isFinite(activity.startTime) && Number.isFinite(activity.endTime));
  assert(activity.startTime <= activity.endTime);

  // Search complete candidates in scheduling order for a shared occupied interval.
  for(const candidate of scheduledActivities) {
    const { startTime, endTime, busyCharacterIds } = candidate;
    if (startTime === null || endTime === null || busyCharacterIds === null) continue;
    assert(Number.isFinite(startTime) && Number.isFinite(endTime));
    assert(startTime <= endTime);
    if (!_activitiesOverlap(activity.startTime, activity.endTime, startTime, endTime)) continue;

    const characterId = _findSharedCharacterId(activity.busyCharacterIds, busyCharacterIds);
    if (characterId !== null) return { characterId, activity:candidate };
  }
  return null;
}
