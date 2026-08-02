import Activity from "./types/Activity";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { formatMsecsAsTimestamp } from "./timestampUtil";
import { findFirstAtActivityStartTime } from "./activityHandlers/atHandler";
import Level from "@/game/types/Level";

export function findFirstActivityStartTime(level:Level, activities:readonly Activity[]):number|null|string {
  if (activities.length <= 0) return null;
  const firstActivity = activities[0];
  if (firstActivity.startTime === null) return null;
  if (firstActivity.verb !== '@') return firstActivity.startTime;
  return findFirstAtActivityStartTime(level, firstActivity);
}

export function findStartTime(authoredStartTime:number|null, firstActivityStartTime:number|null, errors:ErrorCollector):number {
  if (authoredStartTime !== null && firstActivityStartTime !== null) {
    if (firstActivityStartTime < authoredStartTime) {
      const firstStartTimestamp = formatMsecsAsTimestamp(firstActivityStartTime);
      const authoredStartTimestamp = formatMsecsAsTimestamp(authoredStartTime);
      errors.addAt(`First itinerary activity at ${firstStartTimestamp} precedes specified start time of ${authoredStartTimestamp}.`,
          'general', `* startTime=`, authoredStartTimestamp);
      return firstActivityStartTime;
    }
  }
  return authoredStartTime ?? firstActivityStartTime ?? 0;
}