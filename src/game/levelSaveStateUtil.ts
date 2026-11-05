/* This file captures authoritative level progress and checks saves against freshly loaded game state.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import LevelSaveState from '@/persistence/types/LevelSaveState';
import { createDefaultSkinId } from '@/levelLoading/generalLoading';
import ClozeBlank, { UNSPECIFIED_ANSWER } from './conclusions/types/ClozeBlank';
import ClozePartType from './conclusions/types/ClozePartType';
import Conclusion, { duplicateConclusion } from './conclusions/types/Conclusion';
import { syncConclusionUnlocks, updateGameStateForChangeConclusions } from './playerEvents';
import PlayerEventType from './playerEvents/types/PlayerEventType';
import GameState from './types/GameState';

function _getBlanks(conclusion:Conclusion):ClozeBlank[] {
  return conclusion.parts.filter(part => part.type === ClozePartType.blank) as ClozeBlank[];
}

function _restoreConclusion(conclusion:Conclusion, save:LevelSaveState):Conclusion {
  // Preserve authored completion while adding saved completion.
  const restored = duplicateConclusion(conclusion);
  if (save.completedConclusionIds.includes(restored.id)) restored.isComplete = true;

  // Completed blanks use authored answers; absent unfinished selections retain defaults.
  const indexes = save.incompleteConclusionAnswerIndexesById[restored.id];
  _getBlanks(restored).forEach((blank, blankI) => {
    if (restored.isComplete) blank.playerAnswerIndex = blank.correctAnswerIndexes[0];
    else if (indexes !== undefined) blank.playerAnswerIndex = indexes[blankI];
  });
  return restored;
}

/** Applies compatible saved progress, preserving defaults and recomputing conclusion-derived reveals. */
export function restoreLevelSaveProgress(gameState:GameState, save:LevelSaveState):void {
  // Merge saved discoveries into the freshly initialized discovery sets.
  const { discoveryState } = gameState;
  save.discoveredRoomIds.forEach(roomId => discoveryState.discoveredRoomIds.add(roomId));
  save.discoveredItemIds.forEach(itemId => discoveryState.discoveredItemIds.add(itemId));
  save.discoveredSkinIds.forEach(skinId => discoveryState.discoveredSkinIds.add(skinId));
  save.titleKnownCharacterIds.forEach(characterId => discoveryState.titleKnownCharacterIds.add(characterId));

  // Apply all completions before synchronizing identity titles, reveals, and unlocks.
  const conclusions = gameState.conclusions.map(conclusion => _restoreConclusion(conclusion, save));
  updateGameStateForChangeConclusions(gameState, { type:PlayerEventType.CHANGE_CONCLUSIONS, conclusions });
  syncConclusionUnlocks(gameState);
}

/** Copies authoritative progress into an independent save, optionally retaining a committed timeline position. */
export function createLevelSaveState(gameState:GameState, committedTime:number = gameState.time):LevelSaveState {
  // Capture unfinished selections in blank order without retaining mutable state arrays.
  const { discoveryState, conclusions } = gameState;
  const incompleteConclusionAnswerIndexesById:LevelSaveState['incompleteConclusionAnswerIndexesById'] =
    Object.fromEntries(conclusions.filter(conclusion => !conclusion.isComplete)
      .map(conclusion => [conclusion.id, _getBlanks(conclusion).map(blank => blank.playerAnswerIndex)]));

  // Snapshot discoveries and completions; omit derived and transient runtime state.
  return {
    time:committedTime,
    activeCharacterId:gameState.activeCharacterId,
    discoveredRoomIds:[...discoveryState.discoveredRoomIds],
    discoveredItemIds:[...discoveryState.discoveredItemIds],
    discoveredSkinIds:[...discoveryState.discoveredSkinIds],
    titleKnownCharacterIds:[...discoveryState.titleKnownCharacterIds],
    completedConclusionIds:conclusions.filter(conclusion => conclusion.isComplete).map(conclusion => conclusion.id),
    incompleteConclusionAnswerIndexesById
  };
}

function _incompatible(reason:string):false {
  console.error(`Incompatible level save: ${reason}`);
  return false;
}

function _areIdsKnown(ids:readonly string[], knownIds:ReadonlySet<string>, field:string):boolean {
  const unknownId = ids.find(id => !knownIds.has(id));
  return unknownId === undefined || _incompatible(`${field} references unknown ID "${unknownId}".`);
}

/** Checks a structurally valid save against loaded content, logging the first incompatibility. */
export function isLevelSaveStateCompatible(save:LevelSaveState, gameState:GameState):boolean {
  // Validate selection and discovery references against loaded world membership.
  const characterIds = new Set(gameState.baseCharacters.map(character => character.id));
  const roomIds = new Set(gameState.baseRooms.map(room => room.id));
  const skinIds = new Set(gameState.baseCharacters.flatMap(character =>
    [createDefaultSkinId(character.id), ...character.skins.map(skin => skin.id)]));
  if (!_areIdsKnown([save.activeCharacterId], characterIds, 'activeCharacterId')
    || !_areIdsKnown(save.titleKnownCharacterIds, characterIds, 'titleKnownCharacterIds')
    || !_areIdsKnown(save.discoveredRoomIds, roomIds, 'discoveredRoomIds')
    || !_areIdsKnown(save.discoveredItemIds, new Set(gameState.baseItemsById.keys()), 'discoveredItemIds')
    || !_areIdsKnown(save.discoveredSkinIds, skinIds, 'discoveredSkinIds')) return false;

  // Keep the absolute saved coordinate within the itinerary-derived timeline bounds.
  const { startTime, endTime } = gameState.timeline;
  if (save.time < startTime || save.time > endTime) {
    return _incompatible(`time ${save.time} is outside timeline bounds [${startTime}, ${endTime}].`);
  }
  // Validate completed references before checking unfinished selections.
  const conclusionsById = new Map(gameState.conclusions.map(conclusion => [conclusion.id, conclusion]));
  if (!_areIdsKnown(save.completedConclusionIds, new Set(conclusionsById.keys()), 'completedConclusionIds')) return false;

  // Each saved selection must match an unfinished conclusion's authored blanks and choices.
  return Object.entries(save.incompleteConclusionAnswerIndexesById).every(([conclusionId, indexes]) => {
    const conclusion = conclusionsById.get(conclusionId);
    if (!conclusion) return _incompatible(`Unfinished answers reference unknown conclusion "${conclusionId}".`);
    if (indexes === undefined) return _incompatible(`Unfinished answers for "${conclusionId}" are undefined.`);
    if (save.completedConclusionIds.includes(conclusionId)) {
      return _incompatible(`Conclusion "${conclusionId}" has unfinished answers but is also marked completed.`);
    }
    const blanks = _getBlanks(conclusion);
    if (indexes.length !== blanks.length) {
      return _incompatible(`Conclusion "${conclusionId}" has ${indexes.length} saved answers; expected ${blanks.length} blanks.`);
    }
    return indexes.every((index, blankI) => {
      const answerCount = blanks[blankI].availableAnswers.length;
      return index === UNSPECIFIED_ANSWER || (index >= 0 && index < answerCount)
        || _incompatible(`Conclusion "${conclusionId}", blank ${blankI + 1}: answer index ${index} is outside [0, ${answerCount}) and is not ${UNSPECIFIED_ANSWER}.`);
    });
  });
}