import { assert } from 'decent-portal';
import ErrorCollector from "../errorCollection/ErrorCollector";
import { tryParseActivity } from "./parseUtil";
import ActivityParsingRules from "./types/ActivityParsingRules";
import Activity, { ParsedActivity } from './types/Activity';
import { tryParseAbsoluteTimestamp } from './timestampUtil';
import LevelFileSection from '../types/LevelFileSection';

function _findFirstActivityLine(itinerarySection:LevelFileSection):{lineText:string, sectionLineI:number} {
  const lines = itinerarySection.text.split('\n');
  const sectionLineI = lines.findIndex(lineText => lineText.trim().length > 0);
  return { lineText:sectionLineI < 0 ? '' : lines[sectionLineI].trim(), sectionLineI };
}

function _parseFirstActivity(itinerarySection:LevelFileSection, rules:ActivityParsingRules, errors:ErrorCollector):ParsedActivity|null {
  const { lineText, sectionLineI } = _findFirstActivityLine(itinerarySection);
  const parseResult = tryParseActivity(lineText, rules);
  if (typeof parseResult === 'string') {
    errors.addAtLine(parseResult, itinerarySection.lineI + sectionLineI);
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

export function isFirstActivityTimestampValid(itinerarySection:LevelFileSection, errors:ErrorCollector):boolean {
  assert(itinerarySection.text.trim().length > 0); // Don't call for an empty itinerary.
  const { lineText, sectionLineI } = _findFirstActivityLine(itinerarySection);
  const timestampPart = lineText.split(' ')[0];
  const time = tryParseAbsoluteTimestamp(timestampPart);
  if (time === null) {
    errors.addAtLine(`First line in itinerary began with "${timestampPart}". Expecting an absolute timestamp.`,
      itinerarySection.lineI + sectionLineI);
    return false;
  }
  return true;
}

export function findActiveCharacterFromItinerary(itinerarySection:LevelFileSection|undefined, rules:ActivityParsingRules,
    errors:ErrorCollector):string|null {
  if (!itinerarySection?.text.trim()) return null;
  const activity = _parseFirstActivity(itinerarySection, rules, errors);
  if (!activity) return null;
  const characterId = activity.parts.characterId;
  return (typeof characterId === 'string') ? characterId : null;
}