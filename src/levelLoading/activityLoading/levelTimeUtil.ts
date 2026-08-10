import { assertNonNullable } from 'decent-portal';
import ErrorCollector from "../errorCollection/ErrorCollector";
import { tryParseActivity } from "./parseUtil";
import ActivityParsingRules from "./types/ActivityParsingRules";
import Activity from './types/Activity';
import { findFirstAtActivityStartTime } from './activityHandlers/atHandler';
import Room from '@/game/types/Room';
import Character from '@/game/types/Character';

function _parseFirstActivity(itinerarySectionText:string, rules:ActivityParsingRules, errors:ErrorCollector):Activity|null {
  const firstLineEndPos = itinerarySectionText.indexOf('\n');
  const lineText = itinerarySectionText.substring(0, firstLineEndPos === -1 ? itinerarySectionText.length : firstLineEndPos).trim();
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

export function findStartTimeFromItinerary(itinerarySectionText:string, rooms:readonly Room[], characters:readonly Character[], activeCharacterId:string, rules:ActivityParsingRules, errors:ErrorCollector):number|null {
  if (!itinerarySectionText.trim()) return null;
  const parseResult = _parseFirstActivity(itinerarySectionText, rules, errors);
  if (!parseResult) return null;
  
  assertNonNullable(parseResult);
  if (parseResult.startTime !== null) return parseResult.startTime;
  if (parseResult.verb === '@') {
    const atParseResult = findFirstAtActivityStartTime(rooms, characters, activeCharacterId, parseResult);
    if (typeof atParseResult === 'number') return atParseResult; 
    errors.addAt(atParseResult, 'itinerary');
    return null;
  }
  return null;
}

export function findActiveCharacterFromItinerary(itinerarySectionText:string, rules:ActivityParsingRules, errors:ErrorCollector):string|null {
  if (!itinerarySectionText.trim()) return null;
  const activity = _parseFirstActivity(itinerarySectionText, rules, errors);
  if (!activity) return null;
  const characterId = activity.parts.characterId;
  return (typeof characterId === 'string') ? characterId : null;
}