// Groups itinerary parsing, relative timestamp resolution, and activity scheduling during level load.

import { assertNonNullable } from "decent-portal";

import { LeadingTimestampKind, parseLeadingTimestamp } from "@/common/timestampUtil";
import { tryCreateAtActivity } from "./activities/atActivityUtil";
import { tryCreateFaceActivity } from "./activities/faceActivityUtil";
import {
  appendEventsToCharacterState,
  ActivityContext,
  createCharacterActivityState,
  createInitialRoomItemsByRoomId,
  duplicateCharacterActivityState,
  duplicateRoomItemsByRoomId,
  findStatePoseAtTime
} from "./activities/activityUtil";
import { tryCreateSayActivity } from "./activities/sayActivityUtil";
import { tryCreateTakeActivity } from "./activities/takeActivityUtil";
import { tryCreateWanderActivity } from "./activities/wanderActivityUtil";
import LoadLevelException from "./LoadLevelException";
import { createItineraryIndex, findCharacterPose } from "./itineraryUtil";
import Character from "./types/Character";
import Item, { duplicateItem } from "./types/Item";
import Level from "./types/Level";
import Position from "./types/Position";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";

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
  const activityMarkers = [' @', ' says ', ' wanders', ' takes ', ' faces '];
  let splitIndex = -1;

  activityMarkers.forEach(marker => {
    const markerIndex = activityLine.indexOf(marker);
    if (markerIndex <= 0) return;
    if (splitIndex === -1 || markerIndex < splitIndex) splitIndex = markerIndex;
  });

  if (splitIndex === -1) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  const characterId = activityLine.slice(0, splitIndex).trim();
  const activityText = activityLine.slice(splitIndex + 1).trim();
  if (!characterId || !activityText) throw new Error(`unable to parse itinerary activity line '${activityLine}'`);
  return { characterId, activityText };
}

function _parseItineraryActivities(itinerarySection:string, levelFilename:string, firstLineNo:number):ParsedItineraryActivity[] {
  return itinerarySection.split('\n').map((line, index) => ({ line, lineNo:firstLineNo + index }))
    .flatMap(({ line, lineNo }) => {
      return _runWithItineraryLineContext(levelFilename, lineNo, () => {
        const timestamp = parseLeadingTimestamp(line);
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
    const isTimeResolved = activity.timestampKind === 'absolute'
      ? true
      : index === 0
        ? true
        : completionTimesBySourceIndex?.has(index - 1) ?? false;
    const resolvedTime = activity.timestampKind === 'absolute'
      ? (activity.time ?? 0)
      : index === 0
        ? 0
        : completionTimesBySourceIndex?.get(index - 1) ?? resolvedActivities[index - 1].resolvedTime;
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

function _calcActivityCompletionTime(activity:ParsedItineraryActivity, events:ItineraryEvent[]):number {
  return events.reduce((maxEndTime, event) => Math.max(maxEndTime, event.startTime + event.duration), activity.resolvedTime);
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
    tryCreateTakeActivity,
    tryCreateFaceActivity
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
      const events = _createEventsForActivity(activity.activityText, context);
      appendEventsToCharacterState(level, character, context.state, events);
      if (!events.length) context.state.time = Math.max(context.state.time, activity.resolvedTime);
      completionTimesBySourceIndex.set(activity.sourceIndex, _calcActivityCompletionTime(activity, events));
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
      facingAngle: findCharacterPose({ ...character, itinerary }, level.startTime).facingAngle,
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
      return {
        characters:scheduleResult.characters,
        duration:scheduleResult.duration
      };
    }
    resolvedActivities = nextResolvedActivities;
  }

  throw new Error('unable to resolve relative itinerary timestamps');
}
