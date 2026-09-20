/* This file detects overlapping loading-time activities that make the same character busy.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Activity from "../activityLoading/types/Activity";
import { ErrorCollector } from "../errorCollection";
import { formatMsecsAsTimestamp } from "../activityLoading";
import { verbToPlainForm } from "../activityLoading/parseFormatUtil";

function _findSharedCharacterOrItemId(firstIds:readonly string[], secondIds:readonly string[]):string|null {
  return firstIds.find(characterId => secondIds.includes(characterId)) ?? null;
}

function _activitiesOverlap(firstStartTime:number, firstEndTime:number,
    secondStartTime:number, secondEndTime:number):boolean {
  if (firstStartTime === firstEndTime || secondStartTime === secondEndTime) return false;
  return firstStartTime < secondEndTime && secondStartTime < firstEndTime;
}

/** Returns when a character's latest busy interval ending by `latestAllowedEndTime` ends, if any. */
export function findPrecedingBusyCharacterActivityEndTime(characterId:string, latestAllowedEndTime:number,
    scheduledActivities:readonly Activity[]):number|null {
  let latestEndTime:number|null = null;
  for(const activity of scheduledActivities) {
    assertNonNullable(activity.endTime); // All scheduled activities have resolved timing.
    if (activity.endTime > latestAllowedEndTime || !activity.busyCharacterIds.includes(characterId)) continue;
    latestEndTime = Math.max(latestEndTime ?? activity.endTime, activity.endTime);
  }
  return latestEndTime;
}

export function doesActivityConflictWithScheduled(activity:Activity, scheduledActivities:readonly Activity[], errors:ErrorCollector):boolean {
  // Validate the current activity contract supplied by successful scheduling.
  assertNonNullable(activity.startTime);
  assertNonNullable(activity.endTime);
  assertNonNullable(activity.busyCharacterIds);
  assert(Number.isFinite(activity.startTime) && Number.isFinite(activity.endTime));
  assert(activity.startTime <= activity.endTime);

  // Search complete candidates in scheduling order for a shared occupied interval.
  for(const candidate of scheduledActivities) {
    const { startTime, endTime, busyCharacterIds, busyItemIds } = candidate;
    assertNonNullable(startTime); // All scheduled activities should have .startTime and .endTime defined.
    assertNonNullable(endTime);
    if (busyCharacterIds.length === 0 && busyItemIds.length === 0) continue;
    assert(Number.isFinite(startTime) && Number.isFinite(endTime));
    assert(startTime <= endTime);
    if (!_activitiesOverlap(activity.startTime, activity.endTime, startTime, endTime)) continue;

    const conflictingCharacterId = _findSharedCharacterOrItemId(activity.busyCharacterIds, busyCharacterIds);
    if (conflictingCharacterId !== null) { 
      const conflictStart = formatMsecsAsTimestamp(candidate.startTime!);
      errors.addAtLine(`${conflictingCharacterId} can't ${verbToPlainForm(activity.verb)} because they are busy with `
          + `"${candidate.verb}" activity starting at ${conflictStart}.`, activity.lineI);
      return true;
    };

    const conflictingItemId = _findSharedCharacterOrItemId(activity.busyItemIds, busyItemIds);
    if (conflictingItemId !== null) {
      const conflictStart = formatMsecsAsTimestamp(candidate.startTime!);
      const message = `Can't ${verbToPlainForm(activity.verb)} because "${conflictingItemId}" item is busy with `
          + `"${candidate.verb}" activity starting at ${conflictStart}.`;
      errors.addAtLine(message, activity.lineI);
      return true;
    }
  }
  return false;
}