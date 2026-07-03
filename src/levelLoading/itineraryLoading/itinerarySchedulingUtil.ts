/* This module groups itinerary activity scheduling and state-application helpers used during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";
import { normalizeId } from "@/game/idUtil";

import { LeadingTimestampKind } from "@/levelLoading/timestampUtil";
import { addCharacterEncounterEvents } from "@/game/characterEncounterUtil";
import { createItineraryIndex } from "@/game/itineraryUtil";
import Character from "@/game/types/Character";
import Item, { duplicateItem } from "@/game/types/Item";
import Level from "@/game/types/Level";
import Position from "@/game/types/Position";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import BecomesCharacterEvent from "@/game/types/itineraryEvents/BecomesCharacterEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";

import { tryCreateAtActivity } from "../activities/atActivityUtil";
import { tryCreateBecomesCharacterActivity } from "../activities/becomesCharacterActivityUtil";
import { tryCreateBodyOrientationActivity } from "../activities/bodyOrientationActivityUtil";
import { tryCreateBecomesItemActivity } from "../activities/becomesItemActivityUtil";
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
  allCharactersById:Map<string, Character>,
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
  _throwOnUnplacedItineraryCharacter(character.id, characterStatesById);
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

function _throwOnUnplacedItineraryCharacter(characterId:string,
  characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>) {
  if (characterStatesById.has(characterId)) return;
  throw new Error(`character '${characterId}' is not placed in the level, so can't be referenced in itinerary. Name may be incorrect.`);
}

function _resolveScheduledCharacterId(activity:ParsedItineraryActivity,
  characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  pairedCharacterIdByCharacterId:Map<string, string>):string {
  if (!activity.isCharacterImplied || characterStatesById.has(activity.characterId)) return activity.characterId;
  const pairedCharacterId = pairedCharacterIdByCharacterId.get(activity.characterId) || null;
  if (pairedCharacterId && characterStatesById.has(pairedCharacterId)) return pairedCharacterId;
  return activity.characterId;
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

function _createScheduledCharacter(character:Character, state:ReturnType<typeof createCharacterActivityState>, itinerary:ItineraryEvent[], pairedItinerary:ItineraryEvent[]|null):Character {
  return {
    ...character,
    itinerary,
    pairedItinerary,
    itineraryIndex: createItineraryIndex(itinerary, character.position),
    items: state.items.map(duplicateItem),
    leftHandItem: state.leftHandItem ? duplicateItem(state.leftHandItem) : null,
    rightHandItem: state.rightHandItem ? duplicateItem(state.rightHandItem) : null
  };
}

function _createPairedItinerariesByCharacterId(pairedCharacterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>):Map<string, ItineraryEvent[]> {
  const pairedItineraryByState = new Map<ReturnType<typeof createCharacterActivityState>, ItineraryEvent[]>();
  const pairedItinerariesByCharacterId = new Map<string, ItineraryEvent[]>();

  pairedCharacterStatesById.forEach((state, characterId) => {
    let pairedItinerary = pairedItineraryByState.get(state) || null;
    if (!pairedItinerary) {
      // Paired characters share the same merged history object; their own .itinerary stays separate.
      pairedItinerary = [...state.events];
      pairedItineraryByState.set(state, pairedItinerary);
    }
    pairedItinerariesByCharacterId.set(characterId, pairedItinerary);
  });

  return pairedItinerariesByCharacterId;
}

function _applyCharacterReplacementToSchedulingState(charactersById:Map<string, Character>,
  activeCharacterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  finalCharacterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  pairedCharacterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  sourceCharacterId:string, targetCharacterId:string) {
  const sourceCharacter = charactersById.get(sourceCharacterId);
  const targetCharacter = charactersById.get(targetCharacterId);
  const sourceState = activeCharacterStatesById.get(sourceCharacterId);
  assertNonNullable(sourceCharacter, `missing replacement source character ${sourceCharacterId}`);
  assertNonNullable(targetCharacter, `missing replacement target character ${targetCharacterId}`);
  assertNonNullable(sourceState, `missing replacement source state ${sourceCharacterId}`);

  const targetState = duplicateCharacterActivityState(sourceState);
  activeCharacterStatesById.delete(sourceCharacterId);
  activeCharacterStatesById.set(targetCharacterId, targetState);
  finalCharacterStatesById.set(targetCharacterId, targetState);
  pairedCharacterStatesById.set(sourceCharacterId, targetState);
  pairedCharacterStatesById.set(targetCharacterId, targetState);
  charactersById.set(targetCharacterId, {
    ...targetCharacter,
    position:{ ...sourceCharacter.position },
    waypoint:sourceCharacter.waypoint
  });
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
    tryCreateBecomesCharacterActivity,
    tryCreateBecomesItemActivity,
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
  pairedCharacterIdByCharacterId:Map<string, string>, levelFilename:string):PreviewSchedulingResult {
  const poseOverridesByCharacterId = new Map<string, Position>();
  const reusableEventsBySourceIndex = new Map<number, ItineraryEvent[]>();

  activities.forEach(activity => {
    runWithItineraryLineContext(levelFilename, activity.lineNo, () => {
      if (!_activityAffectsPoseAtTimestamp(activity)) return;
      const scheduledCharacterId = _resolveScheduledCharacterId(activity, characterStatesById, pairedCharacterIdByCharacterId);
      const character = charactersById.get(scheduledCharacterId);
      assertNonNullable(character, `unknown character '${scheduledCharacterId}' in itinerary`);

      const state = characterStatesById.get(scheduledCharacterId);
      _throwOnUnplacedItineraryCharacter(scheduledCharacterId, characterStatesById);
      assertNonNullable(state, `missing itinerary state for ${activity.characterId}`);

      const previewState = duplicateCharacterActivityState(state);
      const previewCharacterStatesById = new Map(characterStatesById);
      previewCharacterStatesById.set(scheduledCharacterId, previewState);
      const previewRoomItemsByRoomId = _activityNeedsRoomItemsDuringPosePreview(activity)
        ? duplicateRoomItemsByRoomId(roomItemsByRoomId)
        : roomItemsByRoomId;
      const previewSubjectId = activity.subjectKind === 'character' && activity.isCharacterImplied
        ? scheduledCharacterId
        : activity.subjectId;
      const previewContext = _createActivityContext(level, character, activity.resolvedTime, activity.timestampType, activity.sourceIndex, activity.subjectKind, previewSubjectId,
        previewRoomItemsByRoomId, charactersById, previewCharacterStatesById, poseOverridesByCharacterId);
      const events = _createEventsForActivity(activity.activityText, previewContext);
      appendEventsToCharacterState(level, character, previewState, events);
      if (_canReusePreviewScheduledEvents(activity)) {
        reusableEventsBySourceIndex.set(activity.sourceIndex, events);
      }
      poseOverridesByCharacterId.set(scheduledCharacterId,
        findStatePoseAtTime(character, previewState, activity.resolvedTime).position);
    }, activity.resolvedTime);
  });

  return { poseOverridesByCharacterId, reusableEventsBySourceIndex };
}

function _findBecomesTargetCharacterId(level:Level, activity:ParsedItineraryActivity):string|null {
  if (activity.subjectKind !== 'character' || !activity.activityText.startsWith('becomes ')) return null;
  const targetRef = normalizeId(activity.activityText.slice('becomes '.length).trim());
  for (const character of level.allCharactersById.values()) {
    if (character.id === targetRef || normalizeId(character.title) === targetRef) return character.id;
  }
  return null;
}

function _createPairedCharacterIdByCharacterId(level:Level, activities:ParsedItineraryActivity[]):Map<string, string> {
  const pairedCharacterIdByCharacterId = new Map<string, string>();

  activities.forEach(activity => {
    const targetCharacterId = _findBecomesTargetCharacterId(level, activity);
    if (!targetCharacterId) return;
    pairedCharacterIdByCharacterId.set(activity.characterId, targetCharacterId);
    pairedCharacterIdByCharacterId.set(targetCharacterId, activity.characterId);
  });

  return pairedCharacterIdByCharacterId;
}

function _throwOnUnplacedBecomesCharacterSource(activity:ParsedItineraryActivity,
  characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  pairedCharacterIdByCharacterId:Map<string, string>) {
  if (activity.subjectKind !== 'character' || !activity.activityText.startsWith('becomes ')) return;
  if (_resolveScheduledCharacterId(activity, characterStatesById, pairedCharacterIdByCharacterId) !== activity.characterId) return;
  if (characterStatesById.has(activity.characterId)) return;
  throw new Error(`unknown character replacement source '${activity.characterId}' in authored activity '${activity.activityText}'`);
}

function _createReadyToScheduleBySourceIndex(level:Level, activities:ParsedItineraryActivity[]):Map<number, boolean> {
  const readyBySourceIndex = new Map<number, boolean>();
  const charactersWithUnresolvedEarlierActivities = new Set<string>();

  activities.forEach(activity => {
    const isReady = activity.isTimeResolved && !charactersWithUnresolvedEarlierActivities.has(activity.characterId);
    readyBySourceIndex.set(activity.sourceIndex, isReady);
    if (!activity.isTimeResolved) {
      charactersWithUnresolvedEarlierActivities.add(activity.characterId);
      const becomesTargetCharacterId = _findBecomesTargetCharacterId(level, activity);
      if (becomesTargetCharacterId) charactersWithUnresolvedEarlierActivities.add(becomesTargetCharacterId);
    }
  });

  return readyBySourceIndex;
}

export function scheduleActivities(level:Level, activities:ParsedItineraryActivity[], levelFilename:string):ScheduleActivitiesResult {
  if (!activities.length) {
    const allCharacters:Character[] = [...level.allCharactersById.values()];
    return {
      characters: level.characters,
      allCharactersById:level.allCharactersById,
      duration:calcCharactersItineraryDuration(allCharacters),
      completionTimesBySourceIndex:new Map()
    };
  }

  const charactersById = new Map(level.allCharactersById);
  const characterStatesById = new Map(level.characters.map(character => [character.id, createCharacterActivityState(character)]));
  const finalCharacterStatesById = new Map(characterStatesById);
  const pairedCharacterStatesById = new Map<string, ReturnType<typeof createCharacterActivityState>>();
  const pairedCharacterIdByCharacterId = _createPairedCharacterIdByCharacterId(level, activities);
  const ownEventsByCharacterId = new Map(Array.from(level.allCharactersById.keys()).map(characterId => [characterId, [] as ItineraryEvent[]]));
  const roomItemsByRoomId = createInitialRoomItemsByRoomId(level);
  const completionTimesBySourceIndex = new Map<number, number>();
  const readyToScheduleBySourceIndex = _createReadyToScheduleBySourceIndex(level, activities);

  const _processActivity = (activity:ParsedItineraryActivity, previewSchedulingResult:PreviewSchedulingResult) => {
    runWithItineraryLineContext(levelFilename, activity.lineNo, () => {
      if (!readyToScheduleBySourceIndex.get(activity.sourceIndex)) return;
      _throwOnUnplacedBecomesCharacterSource(activity, characterStatesById, pairedCharacterIdByCharacterId);
      const scheduledCharacterId = _resolveScheduledCharacterId(activity, characterStatesById, pairedCharacterIdByCharacterId);
      const character = charactersById.get(scheduledCharacterId);
      assertNonNullable(character, `unknown character '${scheduledCharacterId}' in itinerary`);
      _throwOnUnplacedItineraryCharacter(scheduledCharacterId, characterStatesById);
      const scheduledSubjectId = activity.subjectKind === 'character' && activity.isCharacterImplied
        ? scheduledCharacterId
        : activity.subjectId;
      const context = _createActivityContext(level, character, activity.resolvedTime, activity.timestampType, activity.sourceIndex, activity.subjectKind, scheduledSubjectId,
        roomItemsByRoomId, charactersById, characterStatesById, previewSchedulingResult.poseOverridesByCharacterId);
      const activityStartTime = calcActivityStartTime(context.state, activity.resolvedTime, activity.timestampType);
      const previewEvents = previewSchedulingResult.reusableEventsBySourceIndex.get(activity.sourceIndex) || null;
      const events = activity.waitDurationMsecs === null
        ? (previewEvents || _createEventsForActivity(activity.activityText, context))
        : [];
      appendEventsToCharacterState(level, character, context.state, events);
      const ownEvents = ownEventsByCharacterId.get(scheduledCharacterId) || null;
      assertNonNullable(ownEvents, `missing owned itinerary for ${scheduledCharacterId}`);
      ownEvents.push(...events);
      const becomesCharacterEvent = events.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER) as BecomesCharacterEvent | undefined;
      if (becomesCharacterEvent) {
        _applyCharacterReplacementToSchedulingState(charactersById, characterStatesById, finalCharacterStatesById, pairedCharacterStatesById,
          becomesCharacterEvent.sourceCharacterId, becomesCharacterEvent.targetCharacterId);
      } else {
        finalCharacterStatesById.set(character.id, context.state);
      }
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
      roomItemsByRoomId, charactersById, characterStatesById, pairedCharacterIdByCharacterId, levelFilename);
    sameTimeActivities.forEach(activity => _processActivity(activity, previewSchedulingResult));
  }

  const pairedItinerariesByCharacterId = _createPairedItinerariesByCharacterId(pairedCharacterStatesById);
  const characters = level.characters.map(character => {
    const state = finalCharacterStatesById.get(character.id);
    assertNonNullable(state, `missing final itinerary state for ${character.id}`);
    const itinerary = ownEventsByCharacterId.get(character.id) || null;
    assertNonNullable(itinerary, `missing owned itinerary for ${character.id}`);
    return _createScheduledCharacter(character, state, itinerary, pairedItinerariesByCharacterId.get(character.id) || null);
  });
  const allCharactersById = new Map(Array.from(level.allCharactersById.entries()).map(([characterId, character]) => {
    const state = finalCharacterStatesById.get(characterId) || null;
    if (!state) return [characterId, character] as const;
    const itinerary = ownEventsByCharacterId.get(characterId) || null;
    assertNonNullable(itinerary, `missing owned itinerary for ${characterId}`);
    return [characterId,
      _createScheduledCharacter(charactersById.get(characterId) || character, state, itinerary, pairedItinerariesByCharacterId.get(characterId) || null)] as const;
  }));
  const allCharacters:Character[] = [...allCharactersById.values()];

  return {
    characters:addCharacterEncounterEvents(characters, level.rooms),
    allCharactersById,
    duration:calcCharactersItineraryDuration(allCharacters),
    completionTimesBySourceIndex
  };
}