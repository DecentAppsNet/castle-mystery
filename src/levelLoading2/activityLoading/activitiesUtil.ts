import { assert } from "decent-portal";
import Activity from "./types/Activity";
import ActivityParsingRules from "./types/ActivityParsingRules";
import { ErrorCollector } from "../errorCollection";
import { tryParseActivity } from "./parseUtil";
import { MSECS_IN_DAY } from "@/common/timeUtil";

// activities param must be in authored order.
function _resolveImpliedSubjects(activities:Activity[], activeCharacterId:string) {
  let lastCharacterId = activeCharacterId;
  for(let i = 0; i < activities.length; ++i) {
    const activity = activities[i];
    const characterId = activity.parts.characterId;
    assert(typeof characterId === 'string');
    if (characterId === null) {
      activity.parts.characterId = lastCharacterId;
    } else {
      lastCharacterId = characterId;
    }
  }
}

function _addIfSet(value:string|number|null|undefined, idSet:Set<string>) {
  if (typeof value === 'string') idSet.add(value);
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
  const groups = _groupActivities(activities);
  let sortedActivities:Activity[] = [];
  groups.forEach(group => { sortedActivities = sortedActivities.concat(group.activities); });
  return sortedActivities;
}

export function findAllCharactersAndItemsInActivities(activities:Activity[]):
    {characterIds:string[], itemIds:string[]} {
  const characterIdSet = new Set<string>();
  const itemIdSet = new Set<string>();
  for(let i = 0; i < activities.length; ++i) {
    const activity = activities[i];
    _addIfSet(activity.parts.characterId, characterIdSet);
    _addIfSet(activity.parts.toCharacterId, characterIdSet);
    _addIfSet(activity.parts.itemId, itemIdSet);
    _addIfSet(activity.parts.toItemId, itemIdSet);
  }
  const characterIds = [...characterIdSet];
  const itemIds = [...itemIdSet];
  return {characterIds, itemIds};
}

export function loadActivitiesPartially(itinerarySectionText:string, rules:ActivityParsingRules, 
    authoredStartTime:number|null, authoredEndTime:number|null, activeCharacterId:string, errors:ErrorCollector):Activity[]|null {
  const originalErrorCount = errors.count;

  if (!itinerarySectionText.trim()) return [];

  const crossesMidnight = authoredEndTime !== null && authoredStartTime !== null && authoredEndTime < authoredStartTime;

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
    if (lineI === 0 && parseResult.startTime === null) parseResult.startTime = authoredStartTime ?? 0;
    if (crossesMidnight && parseResult.startTime !== null && parseResult.startTime < authoredStartTime) parseResult.startTime += MSECS_IN_DAY;
    parseResult.prevActivity = prevActivity;

    activities.push(parseResult);
    prevActivity = parseResult;
  }
  _resolveImpliedSubjects(activities, activeCharacterId);

  const sortedActivities = _sortActivities(activities);
  return errors.count > originalErrorCount ? null : sortedActivities;
}