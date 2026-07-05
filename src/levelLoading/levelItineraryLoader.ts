/* This module orchestrates itinerary parsing, relative timestamp resolution, and activity scheduling during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "../game/types/Character";
import Level from "../game/types/Level";

import { parseItineraryActivities } from "./itineraryLoading/itineraryActivityParseUtil";
import {
  calcCharactersItineraryDuration,
  createEmptyResolvedItineraryTimeline,
  createResolvedItineraryTimeline,
  resolveItineraryActivityTimes,
  validateActivitiesWithinWindow
} from "./itineraryLoading/itineraryTimeResolutionUtil";
import { scheduleActivities } from "./itineraryLoading/itinerarySchedulingUtil";
import LoadItinerariesOptions from "./itineraryLoading/types/LoadItinerariesOptions";
import LoadItinerariesResult from "./itineraryLoading/types/LoadItinerariesResult";

export type { default as LoadItinerariesOptions } from "./itineraryLoading/types/LoadItinerariesOptions";
export type { default as LoadItinerariesResult } from "./itineraryLoading/types/LoadItinerariesResult";

const DEFAULT_LOAD_ITINERARIES_OPTIONS:LoadItinerariesOptions = {
  isCrossMidnight: false,
  explicitEndTime: null
};

export function loadItineraries(level:Level, itinerarySection:string, levelFilename:string, firstLineNo:number,
  options:LoadItinerariesOptions = DEFAULT_LOAD_ITINERARIES_OPTIONS):LoadItinerariesResult {
  const activities = parseItineraryActivities(itinerarySection, levelFilename, firstLineNo, options, level.startTime, level.activeCharacterId);
  if (options.explicitEndTime !== null) {
    validateActivitiesWithinWindow(activities, level.startTime, options.explicitEndTime, levelFilename);
  }
  if (!activities.length) {
    const scheduleResult = scheduleActivities(level, activities, levelFilename);
    const allCharacters:Character[] = [...scheduleResult.allCharactersById.values()];
    return {
      characters: scheduleResult.characters,
      allCharactersById:scheduleResult.allCharactersById,
      duration:calcCharactersItineraryDuration(allCharacters),
      resolvedTimeline:createEmptyResolvedItineraryTimeline(allCharacters)
    };
  }
  let resolvedActivities = resolveItineraryActivityTimes(activities);

  for (let attemptNo = 0; attemptNo < Math.max(2, activities.length + 1); ++attemptNo) {
    const scheduleResult = scheduleActivities(level, resolvedActivities, levelFilename);
    const nextResolvedActivities = resolveItineraryActivityTimes(activities, scheduleResult.completionTimesBySourceIndex);
    const didStabilize = nextResolvedActivities.every((activity, index) =>
      activity.resolvedTime === resolvedActivities[index].resolvedTime
      && activity.isTimeResolved === resolvedActivities[index].isTimeResolved);
    if (didStabilize) {
      const allScheduledCharacters:Character[] = [...scheduleResult.allCharactersById.values()];
      return {
        characters:scheduleResult.characters,
        allCharactersById:scheduleResult.allCharactersById,
        duration:scheduleResult.duration,
        resolvedTimeline:createResolvedItineraryTimeline(resolvedActivities, scheduleResult.completionTimesBySourceIndex, allScheduledCharacters)
      };
    }
    resolvedActivities = nextResolvedActivities;
  }

  throw new Error('unable to resolve relative itinerary timestamps');
}
