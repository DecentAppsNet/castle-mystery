// Groups itinerary parsing, relative timestamp resolution, and activity scheduling during level load.

import { assertNonNullable } from "decent-portal";

import { LeadingTimestampKind, parseLeadingTimestampOrThrowOnInvalid } from "@/common/timestampUtil";
import { tryCreateAtActivity } from "../activities/atActivityUtil";
import { tryCreateDropActivity } from "../activities/dropActivityUtil";
import { tryCreateGiveActivity } from "../activities/giveActivityUtil.ts";
import {
  appendEventsToCharacterState,
  ActivityContext,
  calcActivityStartTime,
  createCharacterActivityState,
  createInitialRoomItemsByRoomId,
  duplicateCharacterActivityState,
  duplicateRoomItemsByRoomId,
  findStatePoseAtTime
} from "../activities/activityUtil";
import { tryCreateSayActivity } from "../activities/sayActivityUtil";
import { tryCreateTakeActivity } from "../activities/takeActivityUtil";
import { tryCreateWanderActivity } from "../activities/wanderActivityUtil";
import LoadLevelException from "./LoadLevelException";
import { addCharacterEncounterEvents } from "../characterEncounterUtil";
import { createItineraryIndex } from "../itineraryUtil";
import Character from "../types/Character";
import Item, { duplicateItem } from "../types/Item";
import Level from "../types/Level";
import Position from "../types/Position";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import { normalizeId } from "../idUtil";

type ParsedItineraryActivity = {
  sourceIndex:number,
  time:number|null,
  resolvedTime:number,
  isTimeResolved:boolean,
  timestampKind:LeadingTimestampKind,
  lineNo:number,
  characterId:string,
  activityText:string
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

function _stripBoundaryPunctuation(text:string):string {
  let startIndex = 0;
  let endIndex = text.length;

  while (startIndex < endIndex && (_isWhitespace(text[startIndex]) || _isAsciiPunctuation(text[startIndex]))) startIndex += 1;
  while (endIndex > startIndex && (_isWhitespace(text[endIndex - 1]) || _isAsciiPunctuation(text[endIndex - 1]))) endIndex -= 1;

  return text.slice(startIndex, endIndex).trim();
}

function _normalizeActivityArgument(text:string, preservedPunctuationChars:Set<string>):string {
  return _stripBoundaryPunctuation(_normalizeWhitespaceAndPunctuationOutsideQuotes(text, preservedPunctuationChars));
}

function _normalizeSpeechActivityText(activityText:string, speechVerb:'says'|'interrupts'):string {
  const speechText = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityText.slice(speechVerb.length), new Set(['"', '\'', '-']));
  if (!speechText.length) return speechVerb;
  return `${speechVerb} ${speechText}`;
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

function _normalizeParsedActivityText(activityText:string):string {
  const trimmedActivityText = activityText.trim();

  if (trimmedActivityText.startsWith('@')) {
    const targetText = _normalizeActivityArgument(trimmedActivityText.slice(1), new Set(['.', '\'', '-']));
    return targetText ? `@ ${targetText}` : '@';
  }
  if (trimmedActivityText.startsWith('says')) return _normalizeSpeechActivityText(trimmedActivityText, 'says');
  if (trimmedActivityText.startsWith('interrupts')) return _normalizeSpeechActivityText(trimmedActivityText, 'interrupts');
  if (trimmedActivityText.startsWith('wanders')) return 'wanders';
  if (trimmedActivityText.startsWith('gives')) return _normalizeGiveActivityText(trimmedActivityText);
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

function _throwErrorWithLoadLevelContext(levelFilename:string, errorLineNo:number, error:unknown):never {
  if (error instanceof LoadLevelException) throw error;
  if (error instanceof Error) throw new LoadLevelException(levelFilename, errorLineNo, error.message, error);
  throw new LoadLevelException(levelFilename, errorLineNo, String(error), error);
}

function _runWithItineraryLineContext<T>(levelFilename:string, errorLineNo:number, callback:() => T):T {
  try {
    return callback();
  } catch (error) {
    _throwErrorWithLoadLevelContext(levelFilename, errorLineNo, error);
  }
}

function _parseCharacterActivityLine(activityLine:string):{ characterId:string, activityText:string } {
  const normalizedLine = _normalizeWhitespaceAndPunctuationOutsideQuotes(activityLine, new Set(['@', '.', '"', '\'', '-']));
  const activityMarkers = [' @', ' says ', ' interrupts ', ' wanders', ' gives ', ' drops ', ' takes '];
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

function _parseItineraryActivities(itinerarySection:string, levelFilename:string, firstLineNo:number):ParsedItineraryActivity[] {
  return itinerarySection.split('\n').map((line, index) => ({ line, lineNo:firstLineNo + index }))
    .flatMap(({ line, lineNo }) => {
      return _runWithItineraryLineContext(levelFilename, lineNo, () => {
        const timestamp = parseLeadingTimestampOrThrowOnInvalid(line);
        if (!timestamp) return [];
        const activityLine = timestamp.remainingText.trim();
        if (!activityLine.length) throw new Error('missing itinerary activity');
        const { characterId, activityText } = _parseCharacterActivityLine(activityLine);
        return [{
          sourceIndex:-1,
          time:timestamp.time,
          resolvedTime:timestamp.time ?? 0,
          isTimeResolved:timestamp.kind === 'absolute',
          timestampKind:timestamp.kind,
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
    const isTimeResolved = activity.timestampKind === 'absolute'
      ? true
      : previousActivitySourceIndex < 0
        ? true
        : completionTimesBySourceIndex?.has(previousActivitySourceIndex) ?? false;
    const resolvedTime = activity.timestampKind === 'absolute'
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

function _createActivityContext(level:Level, character:Character, timestamp:number, timestampKind:LeadingTimestampKind,
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
    timestampKind
  };
}

function _activityAffectsPoseAtTimestamp(activity:ParsedItineraryActivity):boolean {
  if (activity.timestampKind !== 'absolute') return false;
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
      const previewContext = _createActivityContext(level, character, activity.resolvedTime, activity.timestampKind, activity.sourceIndex, previewRoomItemsByRoomId,
        charactersById, previewCharacterStatesById, poseOverridesByCharacterId);
      const events = _createEventsForActivity(activity.activityText, previewContext);
      appendEventsToCharacterState(level, character, previewState, events);
      poseOverridesByCharacterId.set(activity.characterId,
        findStatePoseAtTime(character, previewState, activity.resolvedTime).position);
    });
  });

  return poseOverridesByCharacterId;
}

function _createEventsForActivity(activityText:string, context:ActivityContext):ItineraryEvent[] {
  const activityFactories = [
    tryCreateAtActivity,
    tryCreateSayActivity,
    tryCreateWanderActivity,
    tryCreateGiveActivity,
    tryCreateDropActivity,
    tryCreateTakeActivity
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
      const context = _createActivityContext(level, character, activity.resolvedTime, activity.timestampKind, activity.sourceIndex, roomItemsByRoomId, charactersById,
        characterStatesById, poseOverridesByCharacterId);
      const activityStartTime = calcActivityStartTime(context.state, activity.resolvedTime, activity.timestampKind);
      const events = _createEventsForActivity(activity.activityText, context);
      appendEventsToCharacterState(level, character, context.state, events);
      if (!events.length) context.state.time = Math.max(context.state.time, activityStartTime);
      completionTimesBySourceIndex.set(activity.sourceIndex, _calcActivityCompletionTime(activityStartTime, events));
    });
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
      itineraryIndex: createItineraryIndex(itinerary, { x:character.x, y:character.y }),
      items: state.carriedItems.map(duplicateItem)
    };
  });

  return {
    characters,
    duration:Math.max(0, ...characters.map(character => _calcItineraryDuration(character.itinerary))),
    completionTimesBySourceIndex
  };
}

export function loadItineraries(level:Level, itinerarySection:string, levelFilename:string, firstLineNo:number):{ characters:Character[], duration:number } {
  const activities = _parseItineraryActivities(itinerarySection, levelFilename, firstLineNo);
  if (!activities.length) {
    return {
      characters: level.characters,
      duration:Math.max(0, ...level.characters.map(character => _calcItineraryDuration(character.itinerary)))
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
        duration:scheduleResult.duration
      };
    }
    resolvedActivities = nextResolvedActivities;
  }

  throw new Error('unable to resolve relative itinerary timestamps');
}
