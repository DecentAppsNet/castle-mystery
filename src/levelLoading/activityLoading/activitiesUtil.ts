/* This module parses itinerary activities and prepares their authored relationships for scheduling.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Activity from "./types/Activity";
import ActivityParsingRules from "./types/ActivityParsingRules";
import { ErrorCollector } from "../errorCollection";
import { tryParseActivity } from "./parseUtil";
import { isFirstActivityTimestampValid } from "./levelTimeUtil";
import { assert } from "decent-portal";
import { sortActivities } from "./activitySortingUtil";

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

export function loadActivitiesPartially(itinerarySectionText:string, rules:ActivityParsingRules, 
    startTime:number, activeCharacterId:string, errors:ErrorCollector):Activity[]|null {
  const originalErrorCount = errors.count;

  if (!itinerarySectionText.trim() || !isFirstActivityTimestampValid(itinerarySectionText, errors)) return [];

  const activities:Activity[] = [];
  const lines = itinerarySectionText.split('\n');
  let prevActivity:Activity|null = null;
  for(let sectionLineI = 0; sectionLineI < lines.length; ++sectionLineI) {
    const lineText = lines[sectionLineI];
    if (!lineText.trim()) continue;
    const parseResult = tryParseActivity(lineText, rules);
    if (typeof parseResult === 'string') {
      errors.addAt(parseResult, 'itinerary', lineText);
      continue;
    }
    assert(parseResult.startTime === null || parseResult.startTime >= startTime); // Expecting that the previously-found startTime already looked at activity timestamps to set it.
    if (!prevActivity && parseResult.startTime === null) parseResult.startTime = startTime ?? 0;
    parseResult.prevActivity = prevActivity;
    if (prevActivity) prevActivity.nextActivity = parseResult;

    activities.push(parseResult);
    prevActivity = parseResult;
  }
  _resolveImpliedSubjects(activities, activeCharacterId);

  const sortedActivities = sortActivities(activities, startTime);
  return errors.count > originalErrorCount ? null : sortedActivities;
}