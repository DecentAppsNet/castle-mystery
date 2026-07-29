import { assertNonNullable } from "decent-portal";
import Activity from "./types/Activity";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { formatMsecsAsTimestamp } from "./timestampUtil";

export function findFirstActivityStartTime(activities:readonly Activity[]):number|null {
  if (activities.length <= 0) return null;
  assertNonNullable(activities[0].startTime);
  return activities[0].startTime;
}

export function findStartTime(authoredStartTime:number|null, activities:readonly Activity[], errors:ErrorCollector):number {
  const firstStartTime = findFirstActivityStartTime(activities);
  if (authoredStartTime !== null && firstStartTime !== null) {
    if (firstStartTime < authoredStartTime) {
      const firstStartTimestamp = formatMsecsAsTimestamp(firstStartTime);
      const authoredStartTimestamp = formatMsecsAsTimestamp(authoredStartTime);
      errors.addAt(`First itinerary activity at ${firstStartTimestamp} precedes specified start time of ${authoredStartTime}.`,
          'general', `* startTime=`, authoredStartTimestamp);
      return firstStartTime;
    }
  }
  return authoredStartTime ?? firstStartTime ?? 0;
}