import { assert } from 'decent-portal';
import ErrorCollector from "../errorCollection/ErrorCollector";
import { tryParseActivity } from "./parseUtil";
import ActivityParsingRules from "./types/ActivityParsingRules";
import Activity from './types/Activity';
import { tryParseAbsoluteTimestamp } from './timestampUtil';

function _findFirstActivityLineText(itinerarySectionText:string):string {
  return itinerarySectionText.split('\n').find(lineText => lineText.trim().length > 0)?.trim() ?? '';
}

function _parseFirstActivity(itinerarySectionText:string, rules:ActivityParsingRules, errors:ErrorCollector):Activity|null {
  const lineText = _findFirstActivityLineText(itinerarySectionText);
  const parseResult = tryParseActivity(lineText, rules);
  if (typeof parseResult === 'string') {
    errors.addAt(parseResult, 'itinerary', lineText);
    return null;
  }
  return parseResult;
}

export function findLastActivityEndTime(activities:Activity[]):number|null {
  if (activities.length === 0) return null;
  let latestEndTime = -Infinity;
  for(let i = activities.length - 1; i >= 0; --i) {
    const endTime = activities[i].endTime;
    if (endTime === null || endTime <= latestEndTime) continue;
    latestEndTime = endTime;
  }
  return latestEndTime;
}

export function findStartTimeFromItinerary(itinerarySectionText:string):number|null {
  if (!itinerarySectionText.trim()) return 0;
  const lines = itinerarySectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let earliestTime = Infinity;
  lines.forEach(line => {
    const timestampPart = line.split(' ')[0];
    const time = tryParseAbsoluteTimestamp(timestampPart);
    if (time !== null && time < earliestTime) earliestTime = time;
  });
  return earliestTime === Infinity ? 0 : earliestTime;
}

export function isFirstActivityTimestampValid(itinerarySectionText:string, errors:ErrorCollector):boolean {
  assert(itinerarySectionText.trim().length > 0); // Don't call for an empty itinerary.
  const lineText = _findFirstActivityLineText(itinerarySectionText);
  const timestampPart = lineText.split(' ')[0];
  const time = tryParseAbsoluteTimestamp(timestampPart);
  if (time === null) {
    errors.addAt(`First line in itinerary began with "${timestampPart}". Expecting an absolute timestamp.`, 'itinerary');
    return false;
  }
  return true;
}

export function findActiveCharacterFromItinerary(itinerarySectionText:string, rules:ActivityParsingRules, errors:ErrorCollector):string|null {
  if (!itinerarySectionText.trim()) return null;
  const activity = _parseFirstActivity(itinerarySectionText, rules, errors);
  if (!activity) return null;
  const characterId = activity.parts.characterId;
  return (typeof characterId === 'string') ? characterId : null;
}