/* This file parses itinerary activities and prepares their authored relationships for scheduling.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Activity from "./types/Activity";
import ActivityParsingRules from "./types/ActivityParsingRules";
import { ErrorCollector } from "../errorCollection";
import { tryParseActivity } from "./parseUtil";
import { isFirstActivityTimestampValid } from "./levelTimeUtil";
import { assert } from "decent-portal";
import { sortActivities } from "./activitySortingUtil";
import LevelFileSection from "../types/LevelFileSection";

// activities param must be in authored order.
function _resolveImpliedSubjects(activities:Activity[], activeCharacterId:string) {
  let lastCharacterId = activeCharacterId;
  for(let i = 0; i < activities.length; ++i) {
    const activity = activities[i];
    const characterId = activity.parts.characterId;
    if (typeof characterId === 'string') {
      lastCharacterId = characterId;
    } else {
      activity.parts.characterId = lastCharacterId;
    }
  }
}

/** Parses, links, resolves subjects for, and chronologically orders itinerary activities. */
export function loadActivitiesPartially(itinerarySection:LevelFileSection|undefined, rules:ActivityParsingRules, 
    startTime:number, activeCharacterId:string, errors:ErrorCollector):Activity[]|null {
  const originalErrorCount = errors.count;

  if (!itinerarySection) return [];
  const itinerarySectionText = itinerarySection.text;
  if (!itinerarySectionText.trim() || !isFirstActivityTimestampValid(itinerarySection, errors)) return [];

  const activities:Activity[] = [];
  const lines = itinerarySectionText.split('\n');
  let prevActivity:Activity|null = null;
  for(let sectionLineI = 0; sectionLineI < lines.length; ++sectionLineI) {
    const lineText = lines[sectionLineI];
    if (!lineText.trim()) continue;
    const parseResult = tryParseActivity(lineText, rules);
    if (typeof parseResult === 'string') {
      errors.addAtLine(parseResult, itinerarySection.lineI + sectionLineI);
      continue;
    }
    const activity:Activity = {
      ...parseResult,
      lineI:itinerarySection.lineI + sectionLineI,
      busyCharacterIds:[],
      busyItemIds:[]
    };
    assert(activity.startTime === null || activity.startTime >= startTime); // Expecting that the previously-found startTime already looked at activity timestamps to set it.
    if (!prevActivity && activity.startTime === null) activity.startTime = startTime ?? 0;
    if (prevActivity) prevActivity.nextActivity = activity;

    activities.push(activity);
    prevActivity = activity;
  }
  _resolveImpliedSubjects(activities, activeCharacterId);

  const sortedActivities = sortActivities(activities, startTime);
  return errors.count > originalErrorCount ? null : sortedActivities;
}