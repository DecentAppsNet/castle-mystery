/* This file constructs answer sets with ordered options and lossless canonical identities.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { isNormalizedId } from '@/game/idUtil';
import AnswerSet from './types/AnswerSet';

function _generateAnswerSetId(sourceCategoryIds:readonly string[], answers:readonly string[]):string {
  const payload = JSON.stringify([sourceCategoryIds, [...new Set(answers)].sort()]);
  return 'answer-set-' + payload.split('').map(character => character.charCodeAt(0).toString(16).padStart(4, '0')).join('');
}

/** Retains option order; isExactCategory means one complete category with no fallback additions. */
export function createAnswerSet(answers:readonly string[], contributingCategoryIds:readonly string[],
    isExactCategory:boolean):AnswerSet {
  // Canonicalize provenance separately from the retained option array.
  assert(contributingCategoryIds.every(isNormalizedId));
  const sourceCategoryIds = [...new Set(contributingCategoryIds)].sort();
  assert(!isExactCategory || sourceCategoryIds.length === 1);

  // Only exact built-ins receive reserved identities; every other set includes exact membership.
  const categoryId = sourceCategoryIds[0];
  const isReserved = isExactCategory && ['characters', 'items', 'rooms'].includes(categoryId);
  const id = isReserved ? categoryId : _generateAnswerSetId(sourceCategoryIds, answers);
  return { id, sourceCategoryIds, answers };
}