/* This module groups itinerary timestamp resolution and resolved-timeline summary helpers used during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "@/game/types/Character";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";

import { throwWithItineraryLineContext } from "./itineraryLoadErrorUtil";
import ParsedItineraryActivity from "./types/ParsedItineraryActivity";
import ResolvedItineraryTimeline from "./types/ResolvedItineraryTimeline";

export function resolveItineraryActivityTimes(activities:ParsedItineraryActivity[], completionTimesBySourceIndex?:Map<number, number>):ParsedItineraryActivity[] {
  const resolvedActivities:ParsedItineraryActivity[] = [];

  activities.forEach((activity, index) => {
    const previousActivitySourceIndex = index - 1;
    const isTimeResolved = activity.timestampType === 'absolute'
      ? true
      : previousActivitySourceIndex < 0
        ? activity.isTimeResolved
        : completionTimesBySourceIndex?.has(previousActivitySourceIndex) ?? false;
    const resolvedTime = activity.timestampType === 'absolute'
      ? (activity.time ?? 0)
      : previousActivitySourceIndex < 0
        ? activity.resolvedTime
        : completionTimesBySourceIndex?.get(previousActivitySourceIndex) ?? resolvedActivities[previousActivitySourceIndex].resolvedTime;
    resolvedActivities.push({ ...activity, resolvedTime, isTimeResolved });
  });

  return resolvedActivities;
}

export function sortActivitiesByResolvedTime(activities:ParsedItineraryActivity[]):ParsedItineraryActivity[] {
  return [...activities]
    .sort((a, b) => a.resolvedTime - b.resolvedTime || a.characterId.localeCompare(b.characterId) || a.lineNo - b.lineNo);
}

function _calcItineraryDuration(itinerary:ItineraryEvent[]):number {
  return itinerary.reduce((maxEndTime, event) => Math.max(maxEndTime, event.startTime + event.duration), 0);
}

export function calcCharactersItineraryDuration(characters:Character[]):number {
  return Math.max(0, ...characters.map(character => _calcItineraryDuration(character.itinerary)));
}

function _findLatestResolvedEventEndTime(characters:Character[]):number|null {
  const latestResolvedEventEndTime = calcCharactersItineraryDuration(characters);
  return latestResolvedEventEndTime > 0 ? latestResolvedEventEndTime : null;
}

function _findEarliestAbsoluteActivityTime(activities:ParsedItineraryActivity[]):number|null {
  const absoluteActivities = activities.filter(activity => activity.timestampType === 'absolute');
  return absoluteActivities.length ? Math.min(...absoluteActivities.map(activity => activity.resolvedTime)) : null;
}

function _findEarliestResolvedActivityTime(activities:ParsedItineraryActivity[]):number|null {
  return activities.length ? Math.min(...activities.map(activity => activity.resolvedTime)) : null;
}

function _findLatestResolvedActivityEndTime(completionTimesBySourceIndex:Map<number, number>):number|null {
  const resolvedEndTimes = Array.from(completionTimesBySourceIndex.values());
  return resolvedEndTimes.length ? Math.max(...resolvedEndTimes) : null;
}

export function createResolvedItineraryTimeline(activities:ParsedItineraryActivity[], completionTimesBySourceIndex:Map<number, number>,
  characters:Character[]):ResolvedItineraryTimeline {
  return {
    earliestAbsoluteActivityTime:_findEarliestAbsoluteActivityTime(activities),
    earliestResolvedActivityTime:_findEarliestResolvedActivityTime(activities),
    latestResolvedActivityEndTime:_findLatestResolvedActivityEndTime(completionTimesBySourceIndex),
    latestResolvedEventEndTime:_findLatestResolvedEventEndTime(characters)
  };
}

export function createEmptyResolvedItineraryTimeline(characters:Character[]):ResolvedItineraryTimeline {
  return {
    earliestAbsoluteActivityTime:null,
    earliestResolvedActivityTime:null,
    latestResolvedActivityEndTime:null,
    latestResolvedEventEndTime:_findLatestResolvedEventEndTime(characters)
  };
}

export function validateActivitiesWithinWindow(activities:ParsedItineraryActivity[], startTime:number, endTime:number,
  levelFilename:string) {
  activities.forEach(activity => {
    if (activity.timestampType !== 'absolute' || activity.time === null) return;
    if (activity.time < startTime || activity.time > endTime) {
      throwWithItineraryLineContext(levelFilename, activity.lineNo,
        new Error(`itinerary timestamp ${activity.time}ms is outside the timeline window [${startTime}ms, ${endTime}ms]`));
    }
  });
}