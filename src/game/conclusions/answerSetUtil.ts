/* This file constructs single-category answer sets while retaining their ordered options.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { isNormalizedId } from '@/game/idUtil';
import AnswerSet from './types/AnswerSet';

/** Uses the owning category's local identity and shares its immutable ordered options. */
export function createAnswerSet(answers:readonly string[], sourceCategoryId:string):AnswerSet {
  assert(isNormalizedId(sourceCategoryId));
  return { id:sourceCategoryId, sourceCategoryId, answers };
}