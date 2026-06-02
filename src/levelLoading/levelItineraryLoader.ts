// Groups itinerary parsing, relative timestamp resolution, and activity scheduling during level load.

import { assertNonNullable } from "decent-portal";

import { formatMsecsAsTimestamp, LeadingTimestampKind, parseLeadingTimestampOrThrowOnInvalid } from "@/levelLoading/timestampUtil";
import { MSECS_IN_DAY } from "@/common/timeUtil";
import { tryCreateAtActivity } from "./activities/atActivityUtil";
import { tryCreateDropActivity } from "./activities/dropActivityUtil";
import { tryCreateGiveActivity } from "./activities/giveActivityUtil.ts";
import { tryCreateFaceActivity } from "./activities/facesActivityUtil";
import { tryCreateLockActivity, tryCreateUnlockActivity } from "./activities/lockActivityUtil";
import {
  appendEventsToCharacterState,
  ActivityContext,
  calcActivityStartTime,
  createCharacterActivityState,
  createInitialRoomItemsByRoomId,
  duplicateCharacterActivityState,
  duplicateRoomItemsByRoomId,
  findStatePoseAtTime
} from "./activities/activityUtil";
import { tryCreateSayActivity } from "./activities/sayActivityUtil";
import { tryCreateTakeActivity } from "./activities/takeActivityUtil";
import { tryCreateThinkActivity } from "./activities/thinkActivityUtil";
import LoadLevelException from "./LoadLevelException";
import { addCharacterEncounterEvents } from "../game/characterEncounterUtil";
import { createItineraryIndex } from "../game/itineraryUtil";
import Character from "../game/types/Character";
import Item, { duplicateItem } from "../game/types/Item";
import Level from "../game/types/Level";
import Position from "../game/types/Position";
import ItineraryEvent from "../game/types/itineraryEvents/ItineraryEvent";
import { normalizeId } from "../game/idUtil";

type ParsedItineraryActivity = {
  sourceIndex:number,
  time:number|null,
  resolvedTime:number,
  isTimeResolved:boolean,
  timestampType:LeadingTimestampKind,
  lineNo:number,
  characterId:string,
  activityText:string
};

type ResolvedItineraryTimeline = Readonly<{
  earliestAbsoluteActivityTime:number|null,
  earliestResolvedActivityTime:number|null,
  latestResolvedActivityEndTime:number|null,
  latestResolvedEventEndTime:number|null
}>;

type LoadItinerariesResult = {
  characters:Character[],
  duration:number,
  resolvedTimeline:ResolvedItineraryTimeline
};

export type LoadItinerariesOptions = {
  isCrossMidnight:boolean,
  explicitEndTime:number|null
};

const DEFAULT_LOAD_ITINERARIES_OPTIONS:LoadItinerariesOptions = {
  isCrossMidnight: false,
  explicitEndTime: null
};

const _ASCII_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

function _isWhitespace(char:string):boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function _isAsciiPunctuation(char:string):boolean {
  return _ASCII_PUNCTUATION.includes(char);
}

function _normalizeWhitespaceAndPunctuationOutsideQuotes(text:string, preservedPunctuationChars:Set<string>):string {
  let normalizedText = '';
  let inQuotes = false;
  let pendingSpace = false;

  for (const char of text.trim()) {
    if (char === '"') {
      if (!inQuotes && pendingSpace && normalizedText) normalizedText += ' ';
      normalizedText += char;
      inQuotes = !inQuotes;
      pendingSpace = false;
      continue;
    }
    if (inQuotes) {
      normalizedText += char;
      continue;
    }
    if (_isWhitespace(char) || (_isAsciiPunctuation(char) && !preservedPunctuationChars.has(char))) {
      pendingSpace = normalizedText.length > 0;
      continue;
    }
    if (pendingSpace && normalizedText) normalizedText += ' ';
    normalizedText += char;
    pendingSpace = false;
  }

  return normalizedText.trim();
}

function _stripBoundaryPunctuation(text:string, preservedPunctuationChars:Set<string> = new Set()):string {
  let startIndex = 0;
  let endIndex = text.length;

  while (startIndex < endIndex && (_isWhitespace(text[startIndex]) || (_isAsciiPunctuation(text[startIndex]) && !preservedPunctuationChars.has(text[startIndex])))) startIndex += 1;
  while (endIndex > startIndex && (_isWhitespace(text[endIndex - 1]) || (_isAsciiPunctuation(text[endIndex - 1]) && !preservedPunctuationChars.has(text[endIndex - 1])))) endIndex -= 1;

  return text.slice(startIndex, endIndex).trim();
}

function _normalizeActivityArgument(text:string, preservedPunctuationChars:Set<string>):string {
  return _stripBoundaryPunctuation(_normalizeWhitespaceAndPunctuationOutsideQuotes(text, preservedPunctuationChars), preservedPunctuationChars);
}

function _normalizeSpeechActivityText(activityText:string, speechVerb:'says'|'interrupts'):string {
  const speechText = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityText.slice(speechVerb.length), new Set(['"', '\'', '-']));
  if (!speechText.length) return speechVerb;
  return `${speechVerb} ${speechText}`;
}

function _normalizeThoughtActivityText(activityText:string):string {
  const thoughtText = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityText.slice('thinks'.length), new Set(['"', '\'', '-']));
  if (!thoughtText.length) return 'thinks';
  return `thinks ${thoughtText}`;
}

function _normalizeFacingActivityText(activityText:string):string {
  const facingDirection = _normalizeActivityArgument(activityText.slice('faces'.length), new Set(['\'', '-'])).toLowerCase();
  return facingDirection ? `faces ${facingDirection}` : 'faces';
}

function _normalizeGiveActivityText(activityText:string):string {
  const giveText = activityText.slice('gives'.length).trim();
  const separatorIndex = giveText.lastIndexOf(' to ');
  if (separatorIndex <= 0 || separatorIndex >= giveText.length - ' to '.length) return 'gives';

  const itemRef = _normalizeActivityArgument(giveText.slice(0, separatorIndex), new Set(['.', '\'', '-']));
  const recipientId = _normalizeActivityArgument(giveText.slice(separatorIndex + ' to '.length), new Set(['.', '\'', '-']));
  if (!itemRef || !recipientId) return 'gives';
  return `gives ${itemRef} to ${recipientId}`;
}

function _normalizeRoomTargetActivityText(activityText:string, verb:'locks'|'unlocks'):string {
  const roomRef = _normalizeActivityArgument(activityText.slice(verb.length), new Set(['.', '\'', '-']));
  return roomRef ? `${verb} ${roomRef}` : verb;
}

function _normalizeParsedActivityText(activityText:string):string {
  const trimmedActivityText = activityText.trim();

  if (trimmedActivityText.startsWith('@')) {
    const targetText = _normalizeActivityArgument(trimmedActivityText.slice(1), new Set(['.', '%', '\'', '-']));
    return targetText ? `@ ${targetText}` : '@';
  }
  if (trimmedActivityText.startsWith('says')) return _normalizeSpeechActivityText(trimmedActivityText, 'says');
  if (trimmedActivityText.startsWith('interrupts')) return _normalizeSpeechActivityText(trimmedActivityText, 'interrupts');
  if (trimmedActivityText.startsWith('thinks')) return _normalizeThoughtActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('faces')) return _normalizeFacingActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('gives')) return _normalizeGiveActivityText(trimmedActivityText);
  if (trimmedActivityText.startsWith('unlocks')) return _normalizeRoomTargetActivityText(trimmedActivityText, 'unlocks');
  if (trimmedActivityText.startsWith('locks')) return _normalizeRoomTargetActivityText(trimmedActivityText, 'locks');
  if (trimmedActivityText.startsWith('drops')) {
    const itemRef = _normalizeActivityArgument(trimmedActivityText.slice('drops'.length), new Set(['.', '\'', '-']));
    return itemRef ? `drops ${itemRef}` : 'drops';
  }
  if (trimmedActivityText.startsWith('takes')) {
    const itemRef = _normalizeActivityArgument(trimmedActivityText.slice('takes'.length), new Set(['.', '\'', '-']));
    return itemRef ? `takes ${itemRef}` : 'takes';
  }
  return trimmedActivityText;
}

function _throwErrorWithLoadLevelContext(levelFilename:string, errorLineNo:number, error:unknown, errorTime?:number):never {
  const errorPrefix = errorTime === undefined ? '' : `At ${formatMsecsAsTimestamp(errorTime)}, `;
  if (error instanceof LoadLevelException) throw error;
  if (error instanceof Error) throw new LoadLevelException(levelFilename, errorLineNo, `${errorPrefix}${error.message}`, error);
  throw new LoadLevelException(levelFilename, errorLineNo, `${errorPrefix}${String(error)}`, error);
}

function _runWithItineraryLineContext<T>(levelFilename:string, errorLineNo:number, callback:() => T, errorTime?:number):T {
  try {
    return callback();
  } catch (error) {
    _throwErrorWithLoadLevelContext(levelFilename, errorLineNo, error, errorTime);
  }
}

function _parseCharacterActivityLine(activityLine:string):{ characterId:string, activityText:string } {
  const normalizedLine = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityLine, new Set(['@', '.', '%', '"', '\'', '-']));
  const activityMarkers = [' @', ' says ', ' interrupts ', ' thinks ', ' faces ', ' gives ', ' drops ', ' takes ', ' locks ', ' unlocks '];
  let splitIndex = -1;

  activityMarkers.forEach(marker => {
    const markerIndex = normalizedLine.indexOf(marker);
    if (markerIndex <= 0) return;
    if (splitIndex === -1 || markerIndex < splitIndex) splitIndex = markerIndex;
  });

  if (splitIndex === -1) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  const characterText = _stripBoundaryPunctuation(normalizedLine.slice(0, splitIndex));
  const activityText = _normalizeParsedActivityText(normalizedLine.slice(splitIndex + 1));
  if (!characterText || !activityText) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  return { characterId:normalizeId(characterText), activityText };
}

function _resolveAbsoluteTimestamp(rawMsecs:number|null, options:LoadItinerariesOptions, startTime:number):number|null {
  if (rawMsecs === null) return null;
  if (options.isCrossMidnight && rawMsecs < startTime) return rawMsecs + MSECS_IN_DAY;
  return rawMsecs;
}

function _parseItineraryActivities(itinerarySection:string, levelFilename:string, firstLineNo:number,
  options:LoadItinerariesOptions, startTime:number):ParsedItineraryActivity[] {
  return itinerarySection.split('\n').map((line, index) => ({ line, lineNo:firstLineNo + index }))
    .flatMap(({ line, lineNo }) => {
      return _runWithItineraryLineContext(levelFilename, lineNo, () => {
        const timestamp = parseLeadingTimestampOrThrowOnInvalid(line);
        if (!timestamp) return [];
        const activityLine = timestamp.remainingText.trim();
        if (!activityLine.length) throw new Error('missing itinerary activity');
        const { characterId, activityText } = _parseCharacterActivityLine(activityLine);
        const resolvedTimestamp = timestamp.kind === 'absolute'
          ? _resolveAbsoluteTimestamp(timestamp.time, options, startTime)
          : timestamp.time;
        return [{
          sourceIndex:-1,
          time:resolvedTimestamp,
          resolvedTime:resolvedTimestamp ?? 0,
          isTimeResolved:timestamp.kind === 'absolute',
          timestampType:timestamp.kind,
          lineNo,
          characterId,
          activityText
        }];
      });
    })
    .map((activity, sourceIndex) => ({ ...activity, sourceIndex }));
}

function _resolveItineraryActivityTimes(activities:ParsedItineraryActivity[], completionTimesBySourceIndex?:Map<number, number>):ParsedItineraryActivity[] {
  const resolvedActivities:ParsedItineraryActivity[] = [];

  activities.forEach((activity, index) => {
    const previousActivitySourceIndex = index - 1;
    const isTimeResolved = activity.timestampType === 'absolute'
      ? true
      : previousActivitySourceIndex < 0
        ? true
        : completionTimesBySourceIndex?.has(previousActivitySourceIndex) ?? false;
    const resolvedTime = activity.timestampType === 'absolute'
      ? (activity.time ?? 0)
      : previousActivitySourceIndex < 0
        ? 0
        : completionTimesBySourceIndex?.get(previousActivitySourceIndex) ?? resolvedActivities[previousActivitySourceIndex].resolvedTime;
    resolvedActivities.push({ ...activity, resolvedTime, isTimeResolved });
  });

  return resolvedActivities;
}

function _sortActivitiesByResolvedTime(activities:ParsedItineraryActivity[]):ParsedItineraryActivity[] {
  return [...activities]
    .sort((a, b) => a.resolvedTime - b.resolvedTime || a.characterId.localeCompare(b.characterId) || a.lineNo - b.lineNo);
}

function _createActivityContext(level:Level, character:Character, timestamp:number, timestampType:LeadingTimestampKind,
  activitySourceIndex:number, roomItemsByRoomId:Map<string, Item[]>, charactersById:Map<string, Character>,
  characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>, poseOverridesByCharacterId:Map<string, Position>):ActivityContext {
  const state = characterStatesById.get(character.id);
  assertNonNullable(state, `missing itinerary state for ${character.id}`);
  return {
    level,
    character,
    activitySourceIndex,
    state,
    roomItemsByRoomId,
    charactersById,
    characterStatesById,
    poseOverridesByCharacterId,
    timestamp,
    timestampType
  };
}

function _activityAffectsPoseAtTimestamp(activity:ParsedItineraryActivity):boolean {
  if (activity.timestampType !== 'absolute') return false;
  return activity.activityText.startsWith('@ ') || activity.activityText.startsWith('takes ');
}

function _calcActivityCompletionTime(activityStartTime:number, events:ItineraryEvent[]):number {
  return events.reduce((maxEndTime, event) => Math.max(maxEndTime, event.startTime + event.duration), activityStartTime);
}

function _createPoseOverridesForTimestamp(level:Level, activities:ParsedItineraryActivity[], roomItemsByRoomId:Map<string, Item[]>,
  charactersById:Map<string, Character>, characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  levelFilename:string):Map<string, Position> {
  const poseOverridesByCharacterId = new Map<string, Position>();

  activities.forEach(activity => {
    _runWithItineraryLineContext(levelFilename, activity.lineNo, () => {
      if (!_activityAffectsPoseAtTimestamp(activity)) return;
      const character = charactersById.get(activity.characterId);
      assertNonNullable(character, `unknown character '${activity.characterId}' in itinerary`);

      const state = characterStatesById.get(activity.characterId);
      assertNonNullable(state, `missing itinerary state for ${activity.characterId}`);

      const previewState = duplicateCharacterActivityState(state);
      const previewCharacterStatesById = new Map(characterStatesById);
      previewCharacterStatesById.set(activity.characterId, previewState);
      const previewRoomItemsByRoomId = duplicateRoomItemsByRoomId(roomItemsByRoomId);
      const previewContext = _createActivityContext(level, character, activity.resolvedTime, activity.timestampType, activity.sourceIndex, previewRoomItemsByRoomId,
        charactersById, previewCharacterStatesById, poseOverridesByCharacterId);
      const events = _createEventsForActivity(activity.activityText, previewContext);
      appendEventsToCharacterState(level, character, previewState, events);
      poseOverridesByCharacterId.set(activity.characterId,
        findStatePoseAtTime(character, previewState, activity.resolvedTime).position);
    }, activity.resolvedTime);
  });

  return poseOverridesByCharacterId;
}

function _createEventsForActivity(activityText:string, context:ActivityContext):ItineraryEvent[] {
  const activityFactories = [
    tryCreateAtActivity,
    tryCreateSayActivity,
    tryCreateThinkActivity,
    tryCreateFaceActivity,
    tryCreateGiveActivity,
    tryCreateDropActivity,
    tryCreateTakeActivity,
    tryCreateLockActivity,
    tryCreateUnlockActivity
  ];

  for (const createActivityEvents of activityFactories) {
    const events = createActivityEvents(activityText, context);
    if (events !== null) return events;
  }

  throw new Error(`unsupported itinerary activity '${activityText}'`);
}

function _createReadyToScheduleBySourceIndex(activities:ParsedItineraryActivity[]):Map<number, boolean> {
  const readyBySourceIndex = new Map<number, boolean>();
  const charactersWithUnresolvedEarlierActivities = new Set<string>();

  activities.forEach(activity => {
    const isReady = activity.isTimeResolved && !charactersWithUnresolvedEarlierActivities.has(activity.characterId);
    readyBySourceIndex.set(activity.sourceIndex, isReady);
    if (!activity.isTimeResolved) charactersWithUnresolvedEarlierActivities.add(activity.characterId);
  });

  return readyBySourceIndex;
}

function _calcItineraryDuration(itinerary:ItineraryEvent[]):number {
  const lastEvent = itinerary[itinerary.length - 1];
  return lastEvent ? lastEvent.startTime + lastEvent.duration : 0;
}

function _findLatestResolvedEventEndTime(characters:Character[]):number|null {
  const latestResolvedEventEndTime = Math.max(0, ...characters.map(character => _calcItineraryDuration(character.itinerary)));
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

function _createResolvedItineraryTimeline(activities:ParsedItineraryActivity[], completionTimesBySourceIndex:Map<number, number>,
  characters:Character[]):ResolvedItineraryTimeline {
  return {
    earliestAbsoluteActivityTime:_findEarliestAbsoluteActivityTime(activities),
    earliestResolvedActivityTime:_findEarliestResolvedActivityTime(activities),
    latestResolvedActivityEndTime:_findLatestResolvedActivityEndTime(completionTimesBySourceIndex),
    latestResolvedEventEndTime:_findLatestResolvedEventEndTime(characters)
  };
}

function _createEmptyResolvedItineraryTimeline(characters:Character[]):ResolvedItineraryTimeline {
  return {
    earliestAbsoluteActivityTime:null,
    earliestResolvedActivityTime:null,
    latestResolvedActivityEndTime:null,
    latestResolvedEventEndTime:_findLatestResolvedEventEndTime(characters)
  };
}

function _scheduleActivities(level:Level, activities:ParsedItineraryActivity[], levelFilename:string):{
  characters:Character[],
  duration:number,
  completionTimesBySourceIndex:Map<number, number>
} {
  if (!activities.length) {
    return {
      characters: level.characters,
      duration:Math.max(0, ...level.characters.map(character => _calcItineraryDuration(character.itinerary))),
      completionTimesBySourceIndex:new Map()
    };
  }

  const charactersById = new Map(level.characters.map(character => [character.id, character]));
  const characterStatesById = new Map(level.characters.map(character => [character.id, createCharacterActivityState(character)]));
  const roomItemsByRoomId = createInitialRoomItemsByRoomId(level);
  const completionTimesBySourceIndex = new Map<number, number>();
  const readyToScheduleBySourceIndex = _createReadyToScheduleBySourceIndex(activities);

  const _processActivity = (activity:ParsedItineraryActivity, poseOverridesByCharacterId:Map<string, Position>) => {
    _runWithItineraryLineContext(levelFilename, activity.lineNo, () => {
      if (!readyToScheduleBySourceIndex.get(activity.sourceIndex)) return;
      const character = charactersById.get(activity.characterId);
      assertNonNullable(character, `unknown character '${activity.characterId}' in itinerary`);
      const context = _createActivityContext(level, character, activity.resolvedTime, activity.timestampType, activity.sourceIndex, roomItemsByRoomId, charactersById,
        characterStatesById, poseOverridesByCharacterId);
      const activityStartTime = calcActivityStartTime(context.state, activity.resolvedTime, activity.timestampType);
      const events = _createEventsForActivity(activity.activityText, context);
      appendEventsToCharacterState(level, character, context.state, events);
      if (!events.length) context.state.time = Math.max(context.state.time, activityStartTime);
      completionTimesBySourceIndex.set(activity.sourceIndex, _calcActivityCompletionTime(activityStartTime, events));
    }, activity.resolvedTime);
  };

  const sortedActivities = _sortActivitiesByResolvedTime(activities);
  for (let i = 0; i < sortedActivities.length;) {
    const timestamp = sortedActivities[i].resolvedTime;
    const sameTimeActivities:ParsedItineraryActivity[] = [];
    while (i < sortedActivities.length && sortedActivities[i].resolvedTime === timestamp) {
      sameTimeActivities.push(sortedActivities[i]);
      ++i;
    }

    const readySameTimeActivities = sameTimeActivities.filter(activity => readyToScheduleBySourceIndex.get(activity.sourceIndex));
    const poseOverridesByCharacterId = _createPoseOverridesForTimestamp(level, readySameTimeActivities,
      roomItemsByRoomId, charactersById, characterStatesById, levelFilename);
    sameTimeActivities.forEach(activity => _processActivity(activity, poseOverridesByCharacterId));
  }

  const characters = level.characters.map(character => {
    const state = characterStatesById.get(character.id);
    assertNonNullable(state, `missing final itinerary state for ${character.id}`);
    const itinerary = [...state.events];
    return {
      ...character,
      itinerary,
      itineraryIndex: createItineraryIndex(itinerary, { x:character.x, y:character.y, z:character.depth }),
      items: state.carriedItems.map(duplicateItem)
    };
  });

  return {
    characters,
    duration:Math.max(0, ...characters.map(character => _calcItineraryDuration(character.itinerary))),
    completionTimesBySourceIndex
  };
}

function _validateActivitiesWithinWindow(activities:ParsedItineraryActivity[], startTime:number, endTime:number,
  levelFilename:string) {
  activities.forEach(activity => {
    if (activity.timestampType !== 'absolute' || activity.time === null) return;
    if (activity.time < startTime || activity.time > endTime) {
      _throwErrorWithLoadLevelContext(levelFilename, activity.lineNo,
        new Error(`itinerary timestamp ${activity.time}ms is outside the timeline window [${startTime}ms, ${endTime}ms]`));
    }
  });
}

export function loadItineraries(level:Level, itinerarySection:string, levelFilename:string, firstLineNo:number,
  options:LoadItinerariesOptions = DEFAULT_LOAD_ITINERARIES_OPTIONS):LoadItinerariesResult {
  const activities = _parseItineraryActivities(itinerarySection, levelFilename, firstLineNo, options, level.startTime);
  if (options.explicitEndTime !== null) {
    _validateActivitiesWithinWindow(activities, level.startTime, options.explicitEndTime, levelFilename);
  }
  if (!activities.length) {
    return {
      characters: level.characters,
      duration:Math.max(0, ...level.characters.map(character => _calcItineraryDuration(character.itinerary))),
      resolvedTimeline:_createEmptyResolvedItineraryTimeline(level.characters)
    };
  }
  let resolvedActivities = _resolveItineraryActivityTimes(activities);

  for (let attemptNo = 0; attemptNo < Math.max(2, activities.length + 1); ++attemptNo) {
    const scheduleResult = _scheduleActivities(level, resolvedActivities, levelFilename);
    const nextResolvedActivities = _resolveItineraryActivityTimes(activities, scheduleResult.completionTimesBySourceIndex);
    const didStabilize = nextResolvedActivities.every((activity, index) =>
      activity.resolvedTime === resolvedActivities[index].resolvedTime
      && activity.isTimeResolved === resolvedActivities[index].isTimeResolved);
    if (didStabilize) {
      const charactersWithEncounterEvents = addCharacterEncounterEvents(scheduleResult.characters, level.rooms);
      return {
        characters:charactersWithEncounterEvents,
        duration:scheduleResult.duration,
        resolvedTimeline:_createResolvedItineraryTimeline(resolvedActivities, scheduleResult.completionTimesBySourceIndex, charactersWithEncounterEvents)
      };
    }
    resolvedActivities = nextResolvedActivities;
  }

  throw new Error('unable to resolve relative itinerary timestamps');
}
