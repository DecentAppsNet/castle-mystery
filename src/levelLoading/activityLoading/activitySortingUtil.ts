/* This module orders parsed activities while preserving authored relative-timestamp relationships.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import Activity from "./types/Activity";

type ActivityGroup = {
  startTime:number,
  activities:Activity[]
}

function _areActivitiesWellOrdered(activities:readonly Activity[], startTime:number):boolean {
  let time = startTime;
  for(let i = 0; i < activities.length; ++i) {
    const activity = activities[i];
    if (activity.startTime !== null) {
      if (activity.startTime < time) return false;
      time = activity.startTime;
    }
  }
  return true;
}

function _groupActivities(activities:readonly Activity[]):ActivityGroup[] {
  const groups:ActivityGroup[] = [];
  let group:ActivityGroup = { startTime:activities[0].startTime!, activities:[activities[0]] };
  for(let activityI = 1; activityI < activities.length; ++activityI) {
    const activity = activities[activityI];
    if (activity.startTime === null) {
      group.activities.push(activity);
    } else {
      groups.push(group);
      group = { startTime:activity.startTime, activities:[activity] };
    }
  }
  groups.push(group);
  return groups.sort((a, b) => a.startTime - b.startTime);
}

export function sortActivities(activities:readonly Activity[], startTime:number):Activity[] {
  let sortedActivities:Activity[] = [...activities];
  if (activities.length >= 2) {
    const groups = _groupActivities(activities);
    sortedActivities = [];
    groups.forEach(group => { sortedActivities = sortedActivities.concat(group.activities); });
  }
  assert(_areActivitiesWellOrdered(sortedActivities, startTime));
  return sortedActivities;
}

/** Has a similar result as calling sortActivities(), but is optimized for a single change of one element in the array.
 *  The activity at `updatedActivityI` has had a new .startTime assigned to it, when it was previously null. If there are
 *  other activities with non-null .startTimes that now precede the updated activity's start time, these should be moved
 *  ahead of the updated activity in the array. No activities with null timestamps should be moved.
 *
 * If there is no need for reordering, the original unmodified activities array should be returned.
 */
export function sortActivitiesAfterStartTimeAssignment(activities:Activity[], updatedActivityI:number,
    startTime:number):Activity[] {

  // Most of the time, the activities will already be well-ordered despite the updated activity. So
  // check for that case first to exit with a small amount of work.
  if (_areActivitiesWellOrdered(activities, startTime)) return activities;

  const updatedActivity = activities[updatedActivityI];
  assert(updatedActivity !== undefined);
  assert(updatedActivity.startTime !== null);

  const activitiesToMove:Activity[] = [];
  const remainingActivities:Activity[] = [];
  for(let activityI = updatedActivityI + 1; activityI < activities.length; ++activityI) {
    const activity = activities[activityI];
    if (activity.startTime !== null && activity.startTime < updatedActivity.startTime) {
      activitiesToMove.push(activity);
    } else {
      remainingActivities.push(activity);
    }
  }
  assert(activitiesToMove.length > 0); // If the activities weren't well-ordered, there should be something to move.

  const sortedActivities = [
    ...activities.slice(0, updatedActivityI),
    ...activitiesToMove,
    updatedActivity,
    ...remainingActivities
  ];
  assert(_areActivitiesWellOrdered(sortedActivities, startTime));
  return sortedActivities;
}
