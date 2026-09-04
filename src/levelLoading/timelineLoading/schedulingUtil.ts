/* This file schedules parsed activities into resolved timeline keyframes.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Level from "@/game/types/Level";
import Timeline from "@/game/types/Timeline";
import { sortActivitiesAfterStartTimeAssignment } from "../activityLoading";
import { scheduleAppearsActivity } from "../activityLoading/activitySchedulers/appearsScheduler";
import { scheduleAtActivity } from "../activityLoading/activitySchedulers/atScheduler";
import { scheduleBecomesActivity } from "../activityLoading/activitySchedulers/becomesScheduler";
import { scheduleDropsActivity } from "../activityLoading/activitySchedulers/dropsScheduler";
import { scheduleEmitsActivity } from "../activityLoading/activitySchedulers/emitsScheduler";
import { scheduleFacesActivity } from "../activityLoading/activitySchedulers/facesScheduler";
import { scheduleGivesActivity } from "../activityLoading/activitySchedulers/givesScheduler";
import { scheduleHideActivity } from "../activityLoading/activitySchedulers/hideScheduler";
import { scheduleInterruptsActivity } from "../activityLoading/activitySchedulers/interruptsScheduler";
import { scheduleKneelsActivity } from "../activityLoading/activitySchedulers/kneelsScheduler";
import { scheduleLaysActivity } from "../activityLoading/activitySchedulers/laysScheduler";
import { scheduleLocksActivity } from "../activityLoading/activitySchedulers/locksScheduler";
import { scheduleSaysActivity } from "../activityLoading/activitySchedulers/saysScheduler";
import { scheduleShowActivity } from "../activityLoading/activitySchedulers/showScheduler";
import { scheduleSitsActivity } from "../activityLoading/activitySchedulers/sitsScheduler";
import { scheduleStandsActivity } from "../activityLoading/activitySchedulers/standsScheduler";
import { scheduleTakesActivity } from "../activityLoading/activitySchedulers/takesScheduler";
import { scheduleUnlocksActivity } from "../activityLoading/activitySchedulers/unlocksScheduler";
import { scheduleWaitsActivity } from "../activityLoading/activitySchedulers/waitsScheduler";
import { doesActivityUseEndTimestamp } from "../activityLoading/parseUtil";
import Activity from "../activityLoading/types/Activity";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { createEditableTimeline } from "./editingUtil";
import EditableTimeline from "./types/EditableTimeline";
import WaypointGenerationContext from "../types/WaypointGenerationContext";
import { scheduleThinksActivity } from "../activityLoading/activitySchedulers/thinksScheduler";
import { doesActivityConflictWithScheduled } from "./activityConflictUtil";

type ActivityScheduler = (level:Level, waypointContext:WaypointGenerationContext, activity:Activity,
  timeline:EditableTimeline, errors:ErrorCollector, scheduledActivities:readonly Activity[]) => boolean;
const VERB_TO_ACTIVITY_SCHEDULER:Readonly<{[verb:string]:ActivityScheduler}> = {
  '@': scheduleAtActivity,
  'appears': scheduleAppearsActivity,
  'becomes': scheduleBecomesActivity,
  'takes': scheduleTakesActivity,
  'drops': scheduleDropsActivity,
  'emits': scheduleEmitsActivity,
  'faces': scheduleFacesActivity,
  'gives': scheduleGivesActivity,
  'hide': scheduleHideActivity,
  'interrupts': scheduleInterruptsActivity,
  'kneels': scheduleKneelsActivity,
  'lays': scheduleLaysActivity,
  'locks': scheduleLocksActivity,
  'says': scheduleSaysActivity,
  'show': scheduleShowActivity,
  'sits': scheduleSitsActivity,
  'stands': scheduleStandsActivity,
  'thinks': scheduleThinksActivity,
  'unlocks': scheduleUnlocksActivity,
  'waits': scheduleWaitsActivity
}

function _scheduleActivity(level:Level, waypointContext:WaypointGenerationContext, activity:Activity,
  timeline:EditableTimeline, errors:ErrorCollector, scheduledActivities:readonly Activity[]):boolean {
  const activityScheduler = VERB_TO_ACTIVITY_SCHEDULER[activity.verb];
  assertNonNullable(activityScheduler, `Add scheduler for "${activity.verb}"`);
  if (!doesActivityUseEndTimestamp(activity.verb) && activity.startTime === null) return false; // A preceding activity must be scheduled first.

  if (!activityScheduler(level, waypointContext, activity, timeline, errors, scheduledActivities)) return false;

  // Successful scheduling should assign valid timing and busy-character participation.
  assert(Number.isFinite(activity.startTime) && Number.isFinite(activity.endTime));
  assertNonNullable(activity.startTime);
  assertNonNullable(activity.endTime);
  assert(activity.startTime <= activity.endTime);
  assert(activity.startTime >= level.startTime);
  assertNonNullable(activity.busyCharacterIds);
  assert(activity.busyCharacterIds.every(characterId => level.characters.some(character => character.id === characterId)));
  // Level.endTime is still not known because it requires all scheduling to be completed.

  return true;
}

function _editableTimelineToTimeline(editableTimeline:Readonly<EditableTimeline>):Timeline {
  const { keyframes, roomIdToI, characterIdToI } = editableTimeline;
  return { keyframes, roomIdToI, characterIdToI };
}

function _createEmptyTimeline(level:Readonly<Level>):Timeline {
  const editable = createEditableTimeline(level.characters, level.rooms, 0);
  return _editableTimelineToTimeline(editable);
}

/** Schedules all parsed activities and returns a resolved timeline, or null on error. */
export function scheduleActivities(level:Level, activities:Activity[], waypointContext:WaypointGenerationContext,
  errors:ErrorCollector):Timeline|null {
  if (!activities.length) return _createEmptyTimeline(level);
  const originalErrorCount = errors.count;

  const timeline:EditableTimeline = createEditableTimeline(level.characters, level.rooms, level.startTime);
  // Track only activities that completed scheduling and conflict validation.
  const scheduledActivities:Activity[] = [];
  let toBeScheduled = [...activities];
  for(let attemptI = 0; attemptI < activities.length; ++attemptI) {
    assert(toBeScheduled.length > 0);
    const activity = toBeScheduled[0];
    if (!_scheduleActivity(level, waypointContext, activity, timeline, errors, scheduledActivities)) return null;

    // Reject authored overlap before accepting the activity as successfully scheduled.
    if (doesActivityConflictWithScheduled(activity, scheduledActivities, errors)) return null;
    scheduledActivities.push(activity);

    toBeScheduled.shift();
    const nextActivity = activity.nextActivity;
    if (nextActivity && nextActivity.startTime === null && !doesActivityUseEndTimestamp(nextActivity.verb)) {
      nextActivity.startTime = activity.endTime;
      const nextActivityI = toBeScheduled.indexOf(nextActivity);
      toBeScheduled = sortActivitiesAfterStartTimeAssignment(toBeScheduled, nextActivityI, level.startTime);
    }
  }
  assert(toBeScheduled.length === 0);
  return errors.count > originalErrorCount ? null : _editableTimelineToTimeline(timeline);
}
