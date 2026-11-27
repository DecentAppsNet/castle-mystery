/* This file converts conclusions between book runtime state and saved records.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { createAnswerSet } from '@/conclusions/answerSetUtil';
import AnswerSet from '@/conclusions/types/AnswerSet';
import ClozeBlank, { UNSPECIFIED_ANSWER } from '@/conclusions/types/ClozeBlank';
import ClozeImage from '@/conclusions/types/ClozeImage';
import ClozePart from '@/conclusions/types/ClozePart';
import ClozeText from '@/conclusions/types/ClozeText';
import Conclusion from '@/conclusions/types/Conclusion';
import { isNormalizedId } from '@/game/idUtil';
import SavedBookAnswerSet from '@/persistence/types/SavedBookAnswerSet';
import SavedBookConclusion from '@/persistence/types/SavedBookConclusion';
import SavedClozePart from '@/persistence/types/SavedClozePart';

function _encodePart(part:ClozePart, answerSets:SavedBookAnswerSet[], indexes:Map<AnswerSet, number>):SavedClozePart {
  switch (part.type) {
    case 'separator': return { type:'separator' };
    case 'text': return { type:'text', text:(part as ClozeText).text };
    case 'image': {
      const { imageUrl } = part as ClozeImage;
      assert(typeof imageUrl === 'string', 'Book image URLs must already be resolved.');
      return { type:'image', imageUrl };
    }
    case 'blank': {
      const { answerSet, correctAnswerIndexes, playerAnswerIndex } = part as ClozeBlank;
      let answerSetI = indexes.get(answerSet);
      if (answerSetI === undefined) {
        answerSetI = answerSets.length;
        indexes.set(answerSet, answerSetI);
        answerSets.push({ sourceCategoryId:answerSet.sourceCategoryId, answers:[...answerSet.answers] });
      }
      return { type:'blank', answerSetI, correctAnswerIndexes:[...correctAnswerIndexes], playerAnswerIndex };
    }
  }
}

export function encodeBookConclusion(conclusion:Conclusion):SavedBookConclusion {
  const { id, title, isComplete, isLocked, isOptional, incorrectGuessCount, unlockConclusionIds, revealRoomIds } = conclusion;
  const answerSets:SavedBookAnswerSet[] = [];
  const indexes = new Map<AnswerSet, number>();
  const parts = conclusion.parts.map(part => _encodePart(part, answerSets, indexes));
  return { id, title, parts, answerSets, isComplete, isLocked, isOptional, incorrectGuessCount,
    unlockConclusionIds:[...unlockConclusionIds], revealRoomIds:[...revealRoomIds] };
}

function _isIndexInRange(index:number, length:number):boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function _decodePart(part:SavedClozePart, answerSets:readonly AnswerSet[]):ClozePart|null {
  switch (part.type) {
    case 'separator': return { type:'separator' };
    case 'text': return { type:'text', text:part.text };
    case 'image': return { type:'image', imageUrl:part.imageUrl };
    case 'blank': {
      const { answerSetI, correctAnswerIndexes, playerAnswerIndex } = part;
      if (!_isIndexInRange(answerSetI, answerSets.length)) return null;
      const answerSet = answerSets[answerSetI];
      const optionCount = answerSet.answers.length;
      if (!correctAnswerIndexes.every(index => _isIndexInRange(index, optionCount))) return null;
      if (playerAnswerIndex !== UNSPECIFIED_ANSWER && !_isIndexInRange(playerAnswerIndex, optionCount)) return null;
      return { type:'blank', answerSet, correctAnswerIndexes:[...correctAnswerIndexes], playerAnswerIndex };
    }
  }
}

export function decodeBookConclusion(save:SavedBookConclusion):Conclusion|null {
  const { id, title, isComplete, isLocked, isOptional, incorrectGuessCount, unlockConclusionIds, revealRoomIds } = save;
  if (!save.answerSets.every(({ sourceCategoryId }) => isNormalizedId(sourceCategoryId))) return null;
  const answerSets = save.answerSets.map(({ answers, sourceCategoryId }) => createAnswerSet([...answers], sourceCategoryId));
  const parts:ClozePart[] = [];
  for (const savedPart of save.parts) {
    const part = _decodePart(savedPart, answerSets);
    if (part === null) return null;
    parts.push(part);
  }
  return { id, title, parts, isComplete, isLocked, isOptional, incorrectGuessCount,
    unlockConclusionIds:[...unlockConclusionIds], revealRoomIds:[...revealRoomIds] };
}