/* This file schedules parsed activities into resolved timeline keyframes.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Level from "@/game/types/Level";
import Timeline from "@/game/types/Timeline";
import { sortActivitiesAfterStartTimeAssignment } from "../activityLoading";
import { scheduleAppearsActivity } from "../activityLoading/activityHandlers/appearsHandler";
import { scheduleAtActivity } from "../activityLoading/activityHandlers/atHandler";
import { scheduleBecomesActivity } from "../activityLoading/activityHandlers/becomesHandler";
import { scheduleDropsActivity } from "../activityLoading/activityHandlers/dropsHandler";
import { scheduleEmitsActivity } from "../activityLoading/activityHandlers/emitsHandler";
import { scheduleFacesActivity } from "../activityLoading/activityHandlers/facesHandler";
import { scheduleGivesActivity } from "../activityLoading/activityHandlers/givesHandler";
import { scheduleHideActivity } from "../activityLoading/activityHandlers/hideHandler";
import { scheduleInterruptsActivity } from "../activityLoading/activityHandlers/interruptsHandler";
import { scheduleKneelsActivity } from "../activityLoading/activityHandlers/kneelsHandler";
import { scheduleLaysActivity } from "../activityLoading/activityHandlers/laysHandler";
import { scheduleLocksActivity } from "../activityLoading/activityHandlers/locksHandler";
import { scheduleSaysActivity } from "../activityLoading/activityHandlers/saysHandler";
import { scheduleShowActivity } from "../activityLoading/activityHandlers/showHandler";
import { scheduleSitsActivity } from "../activityLoading/activityHandlers/sitsHandler";
import { scheduleStandsActivity } from "../activityLoading/activityHandlers/standsHandler";
import { scheduleTakesActivity } from "../activityLoading/activityHandlers/takesHandler";
import { scheduleUnlocksActivity } from "../activityLoading/activityHandlers/unlocksHandler";
import { scheduleWaitsActivity } from "../activityLoading/activityHandlers/waitsHandler";
import { doesActivityUseEndTimestamp } from "../activityLoading/parseUtil";
import Activity from "../activityLoading/types/Activity";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { createEditableTimeline } from "./editingUtil";
import EditableTimeline from "./types/EditableTimeline";
import WaypointGenerationContext from "../types/WaypointGenerationContext";
import { scheduleThinksActivity } from "../activityLoading/activityHandlers/thinksHandler";

type ScheduleActivityCallback = (level:Level, waypointContext:WaypointGenerationContext, activity:Activity,
  timeline:EditableTimeline, errors:ErrorCollector) => boolean;
const VERB_TO_SCHEDULE_ACTIVITY_FUNC:Readonly<{[verb:string]:ScheduleActivityCallback}> = {
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
  timeline:EditableTimeline, errors:ErrorCollector):boolean {
  const scheduleActivityFunc = VERB_TO_SCHEDULE_ACTIVITY_FUNC[activity.verb];
  assertNonNullable(scheduleActivityFunc, `Add handler for "${activity.verb}"`);
  if (!doesActivityUseEndTimestamp(activity.verb) && activity.startTime === null) return false; // A preceding activity must be scheduled first.

  if (!scheduleActivityFunc(level, waypointContext, activity, timeline, errors)) return false;

  // Successful scheduling should assign values to startTime and endTime.
  assert(Number.isFinite(activity.startTime) && Number.isFinite(activity.endTime));
  assertNonNullable(activity.startTime);
  assertNonNullable(activity.endTime);
  assert(activity.startTime <= activity.endTime);
  assert(activity.startTime >= level.startTime);
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
  let toBeScheduled = [...activities];
  for(let attemptI = 0; attemptI < activities.length; ++attemptI) {
    assert(toBeScheduled.length > 0);
    const activity = toBeScheduled[0];
    if (!_scheduleActivity(level, waypointContext, activity, timeline, errors)) return null;
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
