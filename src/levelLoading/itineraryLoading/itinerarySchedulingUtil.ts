/* This module groups itinerary activity scheduling and state-application helpers used during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { LeadingTimestampKind } from "@/levelLoading/timestampUtil";
import { addCharacterEncounterEvents } from "@/game/characterEncounterUtil";
import { createItineraryIndex } from "@/game/itineraryUtil";
import Character from "@/game/types/Character";
import Item, { duplicateItem } from "@/game/types/Item";
import Level from "@/game/types/Level";
import Position from "@/game/types/Position";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";

import { tryCreateAtActivity } from "../activities/atActivityUtil";
import { tryCreateBodyOrientationActivity } from "../activities/bodyOrientationActivityUtil";
import { tryCreateDieActivity } from "../activities/dieActivityUtil";
import { tryCreateDropActivity } from "../activities/dropActivityUtil";
import { tryCreateEmitActivity } from "../activities/emitActivityUtil";
import { tryCreateFaceActivity } from "../activities/facesActivityUtil";
import { tryCreateGiveActivity } from "../activities/giveActivityUtil.ts";
import { tryCreateLockActivity, tryCreateUnlockActivity } from "../activities/lockActivityUtil";
import { tryCreateSayActivity } from "../activities/sayActivityUtil";
import { tryCreateShowHideActivity } from "../activities/showHideActivityUtil";
import { tryCreateTakeActivity } from "../activities/takeActivityUtil";
import { tryCreateThinkActivity } from "../activities/thinkActivityUtil";
import type ActivityContext from "../activities/activity/types/ActivityContext";
import {
  appendEventsToCharacterState,
  createCharacterActivityState,
  createInitialRoomItemsByRoomId,
  duplicateCharacterActivityState,
  duplicateRoomItemsByRoomId,
  findStatePoseAtTime
} from "../activities/activity/activityStateUtil";
import { calcActivityStartTime } from "../activities/activity/activitySchedulingUtil";
import { runWithItineraryLineContext } from "./itineraryLoadErrorUtil";
import { calcCharactersItineraryDuration, sortActivitiesByResolvedTime } from "./itineraryTimeResolutionUtil";
import ParsedItineraryActivity from "./types/ParsedItineraryActivity";

type ScheduleActivitiesResult = {
  characters:Character[],
  duration:number,
  completionTimesBySourceIndex:Map<number, number>
};

type PreviewSchedulingResult = {
  poseOverridesByCharacterId:Map<string, Position>,
  reusableEventsBySourceIndex:Map<number, ItineraryEvent[]>
};

const MIN_RELATIVE_ACTIVITY_GAP_MSECS = 1;

function _createActivityContext(level:Level, character:Character, timestamp:number, timestampType:LeadingTimestampKind,
  activitySourceIndex:number, subjectKind:ParsedItineraryActivity['subjectKind'], subjectId:string, roomItemsByRoomId:Map<string, Item[]>, charactersById:Map<string, Character>,
  characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>, poseOverridesByCharacterId:Map<string, Position>):ActivityContext {
  const state = characterStatesById.get(character.id);
  assertNonNullable(state, `missing itinerary state for ${character.id}`);
  return {
    level,
    character,
    subjectKind,
    subjectId,
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

function _activityNeedsRoomItemsDuringPosePreview(activity:ParsedItineraryActivity):boolean {
  return activity.activityText.startsWith('takes ');
}

function _canReusePreviewScheduledEvents(activity:ParsedItineraryActivity):boolean {
  return _activityAffectsPoseAtTimestamp(activity)
    && !_activityNeedsRoomItemsDuringPosePreview(activity);
}

function _calcActivityCompletionTime(activityStartTime:number, events:ItineraryEvent[]):number {
  return events.reduce((maxEndTime, event) => Math.max(maxEndTime, event.startTime + event.duration), activityStartTime);
}

function _calcParsedActivityCompletionTime(activity:ParsedItineraryActivity, activityStartTime:number, events:ItineraryEvent[]):number {
  const eventCompletionTime = _calcActivityCompletionTime(activityStartTime, events);
  if (activity.waitDurationMsecs === null) return eventCompletionTime;
  return Math.max(eventCompletionTime, activityStartTime + activity.waitDurationMsecs);
}

function _calcCompletionTimeForRelativeResolution(activity:ParsedItineraryActivity, activityStartTime:number, events:ItineraryEvent[]):number {
  const activityCompletionTime = _calcParsedActivityCompletionTime(activity, activityStartTime, events);
  if (activity.waitDurationMsecs !== null) return activityCompletionTime;
  if (!events.length) return activityCompletionTime + MIN_RELATIVE_ACTIVITY_GAP_MSECS;
  const hasZeroDurationTerminalEvent = events.some(event => event.duration === 0 && event.startTime === activityCompletionTime);
  if (!hasZeroDurationTerminalEvent) return activityCompletionTime;
  return activityCompletionTime + MIN_RELATIVE_ACTIVITY_GAP_MSECS;
}

function _createEventsForActivity(activityText:string, context:ActivityContext):ItineraryEvent[] {
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  if (context.subjectKind === 'character' && !findStatePoseAtTime(context.character, context.state, activityStartTime).isAlive) {
    throw new Error(`dead character ${context.character.id} cannot perform itinerary activity '${activityText}'`);
  }

  const activityFactories = [
    tryCreateAtActivity,
    tryCreateSayActivity,
    tryCreateEmitActivity,
    tryCreateThinkActivity,
    tryCreateFaceActivity,
    tryCreateDieActivity,
    tryCreateBodyOrientationActivity,
    tryCreateGiveActivity,
    tryCreateDropActivity,
    tryCreateTakeActivity,
    tryCreateShowHideActivity,
    tryCreateLockActivity,
    tryCreateUnlockActivity
  ];

  for (const createActivityEvents of activityFactories) {
    const events = createActivityEvents(activityText, context);
    if (events !== null) return events;
  }

  throw new Error(`unsupported itinerary activity '${activityText}'`);
}

function _createPoseOverridesForTimestamp(level:Level, activities:ParsedItineraryActivity[], roomItemsByRoomId:Map<string, Item[]>,
  charactersById:Map<string, Character>, characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  levelFilename:string):PreviewSchedulingResult {
  const poseOverridesByCharacterId = new Map<string, Position>();
  const reusableEventsBySourceIndex = new Map<number, ItineraryEvent[]>();

  activities.forEach(activity => {
    runWithItineraryLineContext(levelFilename, activity.lineNo, () => {
      if (!_activityAffectsPoseAtTimestamp(activity)) return;
      const character = charactersById.get(activity.characterId);
      assertNonNullable(character, `unknown character '${activity.characterId}' in itinerary`);

      const state = characterStatesById.get(activity.characterId);
      assertNonNullable(state, `missing itinerary state for ${activity.characterId}`);

      const previewState = duplicateCharacterActivityState(state);
      const previewCharacterStatesById = new Map(characterStatesById);
      previewCharacterStatesById.set(activity.characterId, previewState);
      const previewRoomItemsByRoomId = _activityNeedsRoomItemsDuringPosePreview(activity)
        ? duplicateRoomItemsByRoomId(roomItemsByRoomId)
        : roomItemsByRoomId;
      const previewContext = _createActivityContext(level, character, activity.resolvedTime, activity.timestampType, activity.sourceIndex, activity.subjectKind, activity.subjectId,
        previewRoomItemsByRoomId, charactersById, previewCharacterStatesById, poseOverridesByCharacterId);
      const events = _createEventsForActivity(activity.activityText, previewContext);
      appendEventsToCharacterState(level, character, previewState, events);
      if (_canReusePreviewScheduledEvents(activity)) {
        reusableEventsBySourceIndex.set(activity.sourceIndex, events);
      }
      poseOverridesByCharacterId.set(activity.characterId,
        findStatePoseAtTime(character, previewState, activity.resolvedTime).position);
    }, activity.resolvedTime);
  });

  return { poseOverridesByCharacterId, reusableEventsBySourceIndex };
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

export function scheduleActivities(level:Level, activities:ParsedItineraryActivity[], levelFilename:string):ScheduleActivitiesResult {
  if (!activities.length) {
    return {
      characters: level.characters,
      duration:calcCharactersItineraryDuration(level.characters),
      completionTimesBySourceIndex:new Map()
    };
  }

  const charactersById = new Map(level.characters.map(character => [character.id, character]));
  const characterStatesById = new Map(level.characters.map(character => [character.id, createCharacterActivityState(character)]));
  const roomItemsByRoomId = createInitialRoomItemsByRoomId(level);
  const completionTimesBySourceIndex = new Map<number, number>();
  const readyToScheduleBySourceIndex = _createReadyToScheduleBySourceIndex(activities);

  const _processActivity = (activity:ParsedItineraryActivity, previewSchedulingResult:PreviewSchedulingResult) => {
    runWithItineraryLineContext(levelFilename, activity.lineNo, () => {
      if (!readyToScheduleBySourceIndex.get(activity.sourceIndex)) return;
      const character = charactersById.get(activity.characterId);
      assertNonNullable(character, `unknown character '${activity.characterId}' in itinerary`);
      const context = _createActivityContext(level, character, activity.resolvedTime, activity.timestampType, activity.sourceIndex, activity.subjectKind, activity.subjectId,
        roomItemsByRoomId, charactersById, characterStatesById, previewSchedulingResult.poseOverridesByCharacterId);
      const activityStartTime = calcActivityStartTime(context.state, activity.resolvedTime, activity.timestampType);
      const previewEvents = previewSchedulingResult.reusableEventsBySourceIndex.get(activity.sourceIndex) || null;
      const events = activity.waitDurationMsecs === null
        ? (previewEvents || _createEventsForActivity(activity.activityText, context))
        : [];
      appendEventsToCharacterState(level, character, context.state, events);
      const activityCompletionTime = _calcCompletionTimeForRelativeResolution(activity, activityStartTime, events);
      if (!events.length) context.state.time = Math.max(context.state.time, activityCompletionTime);
      completionTimesBySourceIndex.set(activity.sourceIndex, activityCompletionTime);
    }, activity.resolvedTime);
  };

  const sortedActivities = sortActivitiesByResolvedTime(activities);
  for (let i = 0; i < sortedActivities.length;) {
    const timestamp = sortedActivities[i].resolvedTime;
    const sameTimeActivities:ParsedItineraryActivity[] = [];
    while (i < sortedActivities.length && sortedActivities[i].resolvedTime === timestamp) {
      sameTimeActivities.push(sortedActivities[i]);
      ++i;
    }

    const readySameTimeActivities = sameTimeActivities.filter(activity => readyToScheduleBySourceIndex.get(activity.sourceIndex));
    const previewSchedulingResult = _createPoseOverridesForTimestamp(level, readySameTimeActivities,
      roomItemsByRoomId, charactersById, characterStatesById, levelFilename);
    sameTimeActivities.forEach(activity => _processActivity(activity, previewSchedulingResult));
  }

  const characters = level.characters.map(character => {
    const state = characterStatesById.get(character.id);
    assertNonNullable(state, `missing final itinerary state for ${character.id}`);
    const itinerary = [...state.events];
    return {
      ...character,
      itinerary,
      itineraryIndex: createItineraryIndex(itinerary, character.position),
      items: state.items.map(duplicateItem),
      leftHandItem: state.leftHandItem ? duplicateItem(state.leftHandItem) : null,
      rightHandItem: state.rightHandItem ? duplicateItem(state.rightHandItem) : null
    };
  });

  return {
    characters:addCharacterEncounterEvents(characters, level.rooms),
    duration:calcCharactersItineraryDuration(characters),
    completionTimesBySourceIndex
  };
}