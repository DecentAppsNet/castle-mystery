/* This file orders parsed activities while preserving authored relative-timestamp relationships.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import Activity from "./types/Activity";

type ActivityGroup = {
  startTime:number,
  activities:Activity[]
}

function _findFirstBadlyOrderedActivity(activities:readonly Activity[], startTime:number):number {
  let time = startTime;
  for(let i = 0; i < activities.length; ++i) {
    const activity = activities[i];
    if (activity.startTime !== null) {
      if (activity.startTime < time) return i;
      time = activity.startTime;
    }
  }
  return -1;
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

/** Orders timestamped activity groups while preserving authored order within each group. */
export function sortActivities(activities:readonly Activity[], startTime:number):Activity[] {
  let sortedActivities:Activity[] = [...activities];
  if (activities.length >= 2) {
    const groups = _groupActivities(activities);
    sortedActivities = [];
    groups.forEach(group => { sortedActivities = sortedActivities.concat(group.activities); });
  }
  assert(_findFirstBadlyOrderedActivity(sortedActivities, startTime) === -1);
  return sortedActivities;
}

/** Has a similar result as calling sortActivities(), but is optimized for a single change of one element in the array.
 *  The activity at `updatedActivityI` has had a new .startTime assigned to it, when it was previously null. If there are
 *  activities with non-null .startTimes that are no longer in order, they must be reordered around the updated activity.
 *  No activities with null timestamps should be moved.
 *
 * If there is no need for reordering, the original unmodified activities array should be returned.
 */
export function sortActivitiesAfterStartTimeAssignment(activities:Activity[], updatedActivityI:number,
    startTime:number):Activity[] {

  // Most of the time, the activities will already be well-ordered despite the updated activity. So
  // check for that case first to exit with a small amount of work.
  const firstBadlyOrderedActivityI = _findFirstBadlyOrderedActivity(activities, startTime);
  if (firstBadlyOrderedActivityI === -1) return activities;

  const updatedActivity = activities[updatedActivityI];
  assert(updatedActivity !== undefined);
  assert(updatedActivity.startTime !== null);

  // Move the updated activity before the first preceding timestamp that is later than it.
  if (firstBadlyOrderedActivityI <= updatedActivityI) {
    const insertionActivityI = activities.findIndex(activity => activity.startTime !== null
      && activity.startTime > updatedActivity.startTime!);
    assert(insertionActivityI >= 0 && insertionActivityI < updatedActivityI);
    const sortedActivities = [
      ...activities.slice(0, insertionActivityI),
      updatedActivity,
      ...activities.slice(insertionActivityI, updatedActivityI),
      ...activities.slice(updatedActivityI + 1)
    ];
    assert(_findFirstBadlyOrderedActivity(sortedActivities, startTime) === -1);
    return sortedActivities;
  }

  // Separate later timestamped activities that must move ahead of the updated activity.
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

  // Rebuild the array with the earlier timestamped activities before the updated activity.
  const sortedActivities = [
    ...activities.slice(0, updatedActivityI),
    ...activitiesToMove,
    updatedActivity,
    ...remainingActivities
  ];
  assert(_findFirstBadlyOrderedActivity(sortedActivities, startTime) === -1);
  return sortedActivities;
}
