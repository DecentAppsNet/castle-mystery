import { assert } from 'decent-portal';
import ErrorCollector from "../errorCollection/ErrorCollector";
import { tryParseActivity } from "./parseUtil";
import ActivityParsingRules from "./types/ActivityParsingRules";
import Activity from './types/Activity';

export function parseFirstActivityTimeAndCharacter(itinerarySectionText:string, rules:ActivityParsingRules, errors:ErrorCollector):{startTime:number|null, characterId:string|null} {
  const firstLineEndPos = itinerarySectionText.indexOf('\n');
  const lineText = itinerarySectionText.substring(0, firstLineEndPos === -1 ? itinerarySectionText.length : firstLineEndPos).trim();
  const parseResult = tryParseActivity(lineText, rules);
  if (typeof parseResult === 'string') {
    errors.addAt(parseResult, 'itinerary', lineText);
    return { startTime:null, characterId:null }
  }
  const characterId:string|null = parseResult.parts.characterId as string|null ?? null;
  return { startTime:parseResult.startTime, characterId };
}

export function findLastActivityEndTime(activities:Activity[]):number {
  assert(activities.length > 0);
  let latestEndTime = -Infinity;
  for(let i = activities.length - 1; i >= 0; --i) {
    const activity = activities[i];
    const endTime = (activity.startTime ?? 0) + (activity.duration ?? 0);
    if (endTime > latestEndTime) latestEndTime = endTime;
  }
  return latestEndTime;
}