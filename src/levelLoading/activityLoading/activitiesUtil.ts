import Activity from "./types/Activity";
import ActivityParsingRules from "./types/ActivityParsingRules";
import { ErrorCollector } from "../errorCollection";
import { tryParseActivity } from "./parseUtil";
import { isFirstActivityTimestampValid } from "./levelTimeUtil";
import { assert } from "decent-portal";

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

type ActivityGroup = {
  startTime:number,
  activities:Activity[]
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

function _sortActivities(activities:readonly Activity[]):Activity[] {
  if (activities.length < 2) return [...activities];
  const groups = _groupActivities(activities);
  let sortedActivities:Activity[] = [];
  groups.forEach(group => { sortedActivities = sortedActivities.concat(group.activities); });
  return sortedActivities;
}

export function loadActivitiesPartially(itinerarySectionText:string, rules:ActivityParsingRules, 
    startTime:number, activeCharacterId:string, errors:ErrorCollector):Activity[]|null {
  const originalErrorCount = errors.count;

  if (!itinerarySectionText.trim() || !isFirstActivityTimestampValid(itinerarySectionText, errors)) return [];

  const activities:Activity[] = [];
  const lines = itinerarySectionText.split('\n');
  let prevActivity:Activity|null = null;
  for(let lineI = 0; lineI < lines.length; ++lineI) {
    const lineText = lines[lineI];
    if (!lineText.trim()) continue;
    const parseResult = tryParseActivity(lines[lineI], rules);
    if (typeof parseResult === 'string') {
      errors.addAt(parseResult, 'itinerary', lines[lineI]);
      continue;
    }
    assert(parseResult.startTime === null || parseResult.startTime >= startTime); // Expecting that the previously-found startTime already looked at activity timestamps to set it.
    if (lineI === 0 && parseResult.startTime === null) parseResult.startTime = startTime ?? 0;
    parseResult.prevActivity = prevActivity;

    activities.push(parseResult);
    prevActivity = parseResult;
  }
  _resolveImpliedSubjects(activities, activeCharacterId);

  const sortedActivities = _sortActivities(activities);
  return errors.count > originalErrorCount ? null : sortedActivities;
}