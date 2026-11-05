/* This file captures authoritative level progress and checks saves against freshly loaded game state.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import LevelSaveState from '@/persistence/types/LevelSaveState';
import { createDefaultSkinId } from '@/levelLoading/generalLoading';
import ClozeBlank, { UNSPECIFIED_ANSWER } from './conclusions/types/ClozeBlank';
import ClozePartType from './conclusions/types/ClozePartType';
import Conclusion from './conclusions/types/Conclusion';
import GameState from './types/GameState';

function _getBlanks(conclusion:Conclusion):ClozeBlank[] {
  return conclusion.parts.filter(part => part.type === ClozePartType.blank) as ClozeBlank[];
}

export function createLevelSaveState(gameState:GameState, committedTime:number = gameState.time):LevelSaveState {
  const { discoveryState, conclusions } = gameState;
  const incompleteConclusionAnswerIndexesById:LevelSaveState['incompleteConclusionAnswerIndexesById'] =
    Object.fromEntries(conclusions.filter(conclusion => !conclusion.isComplete)
      .map(conclusion => [conclusion.id, _getBlanks(conclusion).map(blank => blank.playerAnswerIndex)]));

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

export function isLevelSaveStateCompatible(save:LevelSaveState, gameState:GameState):boolean {
  const characterIds = new Set(gameState.baseCharacters.map(character => character.id));
  const roomIds = new Set(gameState.baseRooms.map(room => room.id));
  const skinIds = new Set(gameState.baseCharacters.flatMap(character =>
    [createDefaultSkinId(character.id), ...character.skins.map(skin => skin.id)]));
  if (!_areIdsKnown([save.activeCharacterId], characterIds, 'activeCharacterId')
    || !_areIdsKnown(save.titleKnownCharacterIds, characterIds, 'titleKnownCharacterIds')
    || !_areIdsKnown(save.discoveredRoomIds, roomIds, 'discoveredRoomIds')
    || !_areIdsKnown(save.discoveredItemIds, new Set(gameState.baseItemsById.keys()), 'discoveredItemIds')
    || !_areIdsKnown(save.discoveredSkinIds, skinIds, 'discoveredSkinIds')) return false;

  const { startTime, endTime } = gameState.timeline;
  if (save.time < startTime || save.time > endTime) {
    return _incompatible(`time ${save.time} is outside timeline bounds [${startTime}, ${endTime}].`);
  }
  const conclusionsById = new Map(gameState.conclusions.map(conclusion => [conclusion.id, conclusion]));
  if (!_areIdsKnown(save.completedConclusionIds, new Set(conclusionsById.keys()), 'completedConclusionIds')) return false;

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