import { assert } from "decent-portal";
import Activity from "./types/Activity";
import ActivityParsingRules from "./types/ActivityParsingRules";
import { ErrorCollector } from "../errorCollection/errorCollectionApi";
import { tryParseActivity } from "./parseUtil";

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

export function loadActivities(itinerarySectionText:string, rules:ActivityParsingRules, 
      activeCharacterId:string, errors:ErrorCollector):Activity[]|null {
  const originalErrorCount = errors.count;

  if (!itinerarySectionText.trim()) return [];

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
    parseResult.prevActivity = prevActivity;
    activities.push(parseResult);
    prevActivity = parseResult;
  }
  _resolveImpliedSubjects(activities, activeCharacterId);

  return errors.count > originalErrorCount ? null : activities;
}