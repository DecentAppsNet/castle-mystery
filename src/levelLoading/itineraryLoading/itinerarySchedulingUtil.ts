/* This module groups itinerary activity scheduling and state-application helpers used during level load.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";
import { normalizeId } from "@/game/idUtil";

import { LeadingTimestampKind } from "@/levelLoading/timestampUtil";
import { addCharacterEncounterEvents } from "@/game/characterEncounterUtil";
import { createInitialPoseEvent, createItineraryIndex, doesItineraryBeginWithInitialPoseEvent } from "@/game/itineraryUtil";
import Character from "@/game/types/Character";
import CharacterPose from "@/game/types/CharacterPose";
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

// Packages the mutable scheduling state and lookup tables that activity parsers need in order to turn
// one authored itinerary line into concrete runtime events.
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

// Fails when an itinerary line refers to a character who is declared in the level but not currently placed,
// because scheduling logic only knows how to operate on characters with an active mutable state.
function _throwOnUnplacedItineraryCharacter(characterId:string,
  characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>) {
  if (characterStatesById.has(characterId)) return;
  throw new Error(`character '${characterId}' is not placed in the level, so can't be referenced in itinerary. Name may be incorrect.`);
}

// Resolves which placed identity should receive an authored activity when file-order shorthand still refers
// to the pre-swap name after a becomes-character pair has traded which identity is currently placed.
function _resolveScheduledCharacterId(activity:ParsedItineraryActivity,
    characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
    pairedCharacterIdByCharacterId:Map<string, string>):string {
  if (!activity.isCharacterImplied || characterStatesById.has(activity.characterId)) return activity.characterId;
  const pairedCharacterId = pairedCharacterIdByCharacterId.get(activity.characterId) || null;
  if (pairedCharacterId && characterStatesById.has(pairedCharacterId)) return pairedCharacterId;
  return activity.characterId;
}

// Identifies authored lines whose effects can change where a character is considered to be at that exact
// absolute timestamp, which matters when other same-time activities need to target the updated pose.
function _activityAffectsPoseAtTimestamp(activity:ParsedItineraryActivity):boolean {
  if (activity.timestampType !== 'absolute') return false;
  return activity.activityText.startsWith('@ ') || activity.activityText.startsWith('takes ');
}

// Some previews must simulate room-item movement as well as character pose, because taking an item changes
// which floor square is occupied by an item during later same-timestamp targeting.
function _activityNeedsRoomItemsDuringPosePreview(activity:ParsedItineraryActivity):boolean {
  return activity.activityText.startsWith('takes ');
}

// Preview-scheduled events can be reused during the real scheduling pass only when they depend solely on pose,
// not on mutable room-item state that may differ between preview and execution.
function _canReusePreviewScheduledEvents(activity:ParsedItineraryActivity):boolean {
  return _activityAffectsPoseAtTimestamp(activity)
    && !_activityNeedsRoomItemsDuringPosePreview(activity);
}

// Finds when the concrete emitted events from one authored activity have fully finished.
function _calcActivityCompletionTime(activityStartTime:number, events:ItineraryEvent[]):number {
  return events.reduce((maxEndTime, event) => Math.max(maxEndTime, event.startTime + event.duration), activityStartTime);
}

// Combines event completion with an explicit waits duration, because waits extend the authored activity chain
// even though they do not emit their own itinerary event.
function _calcParsedActivityCompletionTime(activity:ParsedItineraryActivity, activityStartTime:number, events:ItineraryEvent[]):number {
  const eventCompletionTime = _calcActivityCompletionTime(activityStartTime, events);
  if (activity.waitDurationMsecs === null) return eventCompletionTime;
  return Math.max(eventCompletionTime, activityStartTime + activity.waitDurationMsecs);
}

// Calculates when a later ':' line is allowed to begin, including the tiny gap needed after zero-duration
// terminal events so two relative activities do not collapse onto the exact same authored instant.
function _calcCompletionTimeForRelativeResolution(activity:ParsedItineraryActivity, activityStartTime:number, events:ItineraryEvent[]):number {
  const activityCompletionTime = _calcParsedActivityCompletionTime(activity, activityStartTime, events);
  if (activity.waitDurationMsecs !== null) return activityCompletionTime;
  if (!events.length) return activityCompletionTime + MIN_RELATIVE_ACTIVITY_GAP_MSECS;
  const hasZeroDurationTerminalEvent = events.some(event => event.duration === 0 && event.startTime === activityCompletionTime);
  if (!hasZeroDurationTerminalEvent) return activityCompletionTime;
  return activityCompletionTime + MIN_RELATIVE_ACTIVITY_GAP_MSECS;
}

// Captures the non-transient visual pose that a character starts with before any speech, thought, or itinerary
// events have had a chance to modify them.
function _createInitialCharacterPose(character:Character):CharacterPose {
  return {
    position:{ ...character.position },
    isAlive:character.isAlive,
    facingDirection:character.facingDirection,
    bodyOrientation:character.bodyOrientation,
    speech:null,
    thought:null
  };
}

// Chooses the timestamp for the seeded InitialPoseEvent so replay starts no later than the first real event,
// falling back to the level start when a character never performs an activity.
function _findInitialPoseStartTime(level:Level, itinerary:ItineraryEvent[]):number {
  return itinerary[0]?.startTime ?? level.startTime;
}

// Adds the replay seed for a character who never shares a merged becomes-character history with another identity.
function _createSeededUnpairedItinerary(level:Level, character:Character, itinerary:ItineraryEvent[]):ItineraryEvent[] {
  return [createInitialPoseEvent(
    _findInitialPoseStartTime(level, itinerary),
    character.id,
    _createInitialCharacterPose(character),
    null,
    null
  ), ...itinerary];
}

// Picks the identity whose first authored event happens earliest so the paired InitialPoseEvent has a stable
// "first" and "second" character ordering for indexing and replay.
function _findFirstPairedCharacterId(characterIds:string[], ownEventsByCharacterId:Map<string, ItineraryEvent[]>):string {
  let firstCharacterId = characterIds[0];
  let firstStartTime = Number.POSITIVE_INFINITY;

  characterIds.forEach(characterId => {
    const startTime = ownEventsByCharacterId.get(characterId)?.[0]?.startTime ?? Number.POSITIVE_INFINITY;
    if (startTime < firstStartTime) {
      firstStartTime = startTime;
      firstCharacterId = characterId;
    }
  });

  return firstCharacterId;
}

// Builds the final InitialPoseEvent for a becomes-character pair and prepends it both to the shared paired
// history and to each identity's own itinerary so every replay entry point starts from explicit state.
function _createSeededPairedItinerariesByCharacterId(level:Level, charactersById:Map<string, Character>,
  ownEventsByCharacterId:Map<string, ItineraryEvent[]>, pairedItinerariesByCharacterId:Map<string, ItineraryEvent[]>) {
  const seededOwnItinerariesByCharacterId = new Map<string, ItineraryEvent[]>();
  const seededPairedItinerariesByCharacterId = new Map<string, ItineraryEvent[]>();
  const characterIdsByPairedItinerary = new Map<ItineraryEvent[], string[]>();

  // The paired-itinerary map is keyed by character id, but two ids can share the same merged history object.
  // Group by that shared object so we can seed each pair exactly once.
  pairedItinerariesByCharacterId.forEach((pairedItinerary, characterId) => {
    const characterIds = characterIdsByPairedItinerary.get(pairedItinerary) || [];
    characterIds.push(characterId);
    characterIdsByPairedItinerary.set(pairedItinerary, characterIds);
  });

  characterIdsByPairedItinerary.forEach((characterIds, pairedItinerary) => {
    if (characterIds.length !== 2) return;
    const firstCharacterId = _findFirstPairedCharacterId(characterIds, ownEventsByCharacterId);
    const secondCharacterId = characterIds.find(characterId => characterId !== firstCharacterId) || null;
    assertNonNullable(secondCharacterId, `missing paired initial-pose second character for ${firstCharacterId}`);
    const firstCharacter = charactersById.get(firstCharacterId) || null;
    const secondCharacter = charactersById.get(secondCharacterId) || null;
    assertNonNullable(firstCharacter, `missing paired initial-pose character ${firstCharacterId}`);
    assertNonNullable(secondCharacter, `missing paired initial-pose character ${secondCharacterId}`);

    // Use the earliest relevant timestamp from either own or shared history so the seeded event is visible
    // to any replay that asks about time before the pair's first authored transition.
    const initialPoseEvent = createInitialPoseEvent(
      Math.min(
        _findInitialPoseStartTime(level, pairedItinerary),
        _findInitialPoseStartTime(level, ownEventsByCharacterId.get(firstCharacterId) || []),
        _findInitialPoseStartTime(level, ownEventsByCharacterId.get(secondCharacterId) || [])
      ),
      firstCharacterId,
      _createInitialCharacterPose(firstCharacter),
      secondCharacterId,
      _createInitialCharacterPose(secondCharacter)
    );
    const seededPairedItinerary = [initialPoseEvent, ...pairedItinerary];
    characterIds.forEach(characterId => {
      seededPairedItinerariesByCharacterId.set(characterId, seededPairedItinerary);
      seededOwnItinerariesByCharacterId.set(characterId, [initialPoseEvent, ...(ownEventsByCharacterId.get(characterId) || [])]);
    });
  });

  return { seededOwnItinerariesByCharacterId, seededPairedItinerariesByCharacterId };
}

// Rebuilds the loader's final Character objects from mutable scheduling state, preserving every declared
// identity in allCharactersById and attaching the seeded replayable itineraries they ended up with.
function _createRetainedLoadedCharacters(level:Level, charactersById:Map<string, Character>,
  finalCharacterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  ownEventsByCharacterId:Map<string, ItineraryEvent[]>, pairedItinerariesByCharacterId:Map<string, ItineraryEvent[]>) {
  const { seededOwnItinerariesByCharacterId, seededPairedItinerariesByCharacterId } = _createSeededPairedItinerariesByCharacterId(
    level,
    charactersById,
    ownEventsByCharacterId,
    pairedItinerariesByCharacterId
  );

  // level.characters contains only identities that begin placed, so this array becomes the runtime placed cast.
  const characters = level.characters.map(character => {
    const state = finalCharacterStatesById.get(character.id);
    assertNonNullable(state, `missing final itinerary state for ${character.id}`);
    const baseCharacter = charactersById.get(character.id) || character;
    const seededItinerary = seededOwnItinerariesByCharacterId.get(character.id)
      || _createSeededUnpairedItinerary(level, baseCharacter, ownEventsByCharacterId.get(character.id) || []);
    return _createScheduledCharacter(baseCharacter, state, seededItinerary, seededPairedItinerariesByCharacterId.get(character.id) || null);
  });

  // allCharactersById must remain a superset containing placed and unplaced identities, including becomes targets
  // that may never have been actively scheduled but still need a replayable seeded history.
  const allCharactersById = new Map(Array.from(level.allCharactersById.entries()).flatMap(([characterId, character]) => {
    const baseCharacter = charactersById.get(characterId) || character;
    const state = finalCharacterStatesById.get(characterId) || createCharacterActivityState(baseCharacter);
    const seededItinerary = seededOwnItinerariesByCharacterId.get(characterId)
      || _createSeededUnpairedItinerary(level, baseCharacter, ownEventsByCharacterId.get(characterId) || []);
    return [[characterId,
      _createScheduledCharacter(baseCharacter, state, seededItinerary, seededPairedItinerariesByCharacterId.get(characterId) || null)] as const];
  }));

  return { characters, allCharactersById };
}

// Converts mutable activity state back into an immutable Character object while asserting that its event history
// has already been made replayable by seeding an InitialPoseEvent.
function _createScheduledCharacter(character:Character, state:ReturnType<typeof createCharacterActivityState>, itinerary:ItineraryEvent[], pairedItinerary:ItineraryEvent[]|null):Character {
  assert(doesItineraryBeginWithInitialPoseEvent(state.events), `Can't create scheduled character with invalid events - missing initial pose event.`);
  return {
    ...character,
    itinerary,
    pairedItinerary,
    itineraryIndex: createItineraryIndex(itinerary, character.position, character.id),
    items: state.items.map(duplicateItem),
    leftHandItem: state.leftHandItem ? duplicateItem(state.leftHandItem) : null,
    rightHandItem: state.rightHandItem ? duplicateItem(state.rightHandItem) : null
  };
}

// Turns the paired-character mutable states into shared merged histories, where "paired itinerary" means the
// combined timeline seen when two identities swap which one is currently placed via becomes-character.
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

// When one identity becomes another, scheduling continues on a cloned mutable state owned by the target id so
// later activities treat the replacement as the currently placed character while preserving shared pair history.
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
    position:{ ...sourceState.position },
    waypoint:sourceState.waypoint
  });
}

// Dispatches one authored activity line to the first parser that understands it, after verifying the subject
// character is alive at the authored start time.
function _createEventsForActivity(activityText:string, context:ActivityContext):ItineraryEvent[] {
  const activityStartTime = calcActivityStartTime(context.state, context.timestamp, context.timestampType);
  assert(doesItineraryBeginWithInitialPoseEvent(context.character.itinerary), `I can't learn alive state without an initial pose event.`);
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

// Pre-schedules the subset of same-timestamp activities whose results can affect where characters are located,
// so later same-time targeting can ask "where is this character right now?" using the previewed pose.
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

      // Preview work happens on cloned mutable state so same-timestamp targeting can see the future pose
      // without committing those changes to the real scheduling pass yet.
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

// Recognizes authored becomes-character lines and resolves the target reference to the canonical character id.
function _findBecomesTargetCharacterId(level:Level, activity:ParsedItineraryActivity):string|null {
  if (activity.subjectKind !== 'character' || !activity.activityText.startsWith('becomes ')) return null;
  const targetRef = normalizeId(activity.activityText.slice('becomes '.length).trim());
  for (const character of level.allCharactersById.values()) {
    if (character.id === targetRef || normalizeId(character.title) === targetRef) return character.id;
  }
  return null;
}

// Builds the symmetric lookup that says which two identities belong to one becomes-character pair.
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

// Produces a clearer error for the specific case where an authored becomes-character source was never placed,
// instead of letting later generic scheduling lookups fail in a less understandable way.
function _throwOnUnplacedBecomesCharacterSource(activity:ParsedItineraryActivity,
  characterStatesById:Map<string, ReturnType<typeof createCharacterActivityState>>,
  pairedCharacterIdByCharacterId:Map<string, string>) {
  if (activity.subjectKind !== 'character' || !activity.activityText.startsWith('becomes ')) return;
  if (_resolveScheduledCharacterId(activity, characterStatesById, pairedCharacterIdByCharacterId) !== activity.characterId) return;
  if (characterStatesById.has(activity.characterId)) return;
  throw new Error(`unknown character replacement source '${activity.characterId}' in authored activity '${activity.activityText}'`);
}

// Marks which authored lines are safe to schedule now; an activity is "ready" only after its timestamp has been
// resolved and there is no earlier unresolved file-ordered activity for the same identity or its becomes target.
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

// Orchestrates the full level-load scheduling pass: create mutable state, preview same-timestamp pose changes,
// schedule real events, apply becomes-character swaps, then rebuild the final replayable Character objects.
export function scheduleActivities(level:Level, activities:ParsedItineraryActivity[], levelFilename:string):ScheduleActivitiesResult {
  if (!activities.length) {
    const charactersById = new Map(level.allCharactersById);
    const finalCharacterStatesById = new Map(level.characters.map(character => [character.id, createCharacterActivityState(character)]));
    const ownEventsByCharacterId = new Map(Array.from(level.allCharactersById.keys()).map(characterId => [characterId, [] as ItineraryEvent[]]));
    const pairedItinerariesByCharacterId = new Map<string, ItineraryEvent[]>();
    const finalizedCharacters = _createRetainedLoadedCharacters(level, charactersById, finalCharacterStatesById, 
      ownEventsByCharacterId, pairedItinerariesByCharacterId);
    const allCharacters:Character[] = [...finalizedCharacters.allCharactersById.values()];
    return {
      characters: finalizedCharacters.characters,
      allCharactersById:finalizedCharacters.allCharactersById,
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

  // Runs one activity against the real mutable scheduling state after the preview pass has already computed
  // any same-timestamp pose overrides needed for targeting and event reuse.
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

  // Activities with the same resolved timestamp are handled as a batch so pose previews can answer questions
  // about "where someone is at this instant" before the real scheduling pass commits the state updates.
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
  const finalizedCharacters = _createRetainedLoadedCharacters(level, charactersById, finalCharacterStatesById,
    ownEventsByCharacterId, pairedItinerariesByCharacterId);
  const characters = finalizedCharacters.characters;
  const allCharactersById = finalizedCharacters.allCharactersById;
  const allCharacters:Character[] = [...allCharactersById.values()];

  return {
    characters:addCharacterEncounterEvents(characters, level.rooms),
    allCharactersById,
    duration:calcCharactersItineraryDuration(allCharacters),
    completionTimesBySourceIndex
  };
}