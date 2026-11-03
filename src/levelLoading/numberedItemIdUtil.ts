/* This file identifies single terminal numbered suffixes in normalized item IDs.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { isAsciiDigitSequence } from '@/common/regExUtil';

function _getBaseBeforeNumberedSuffix(itemId:string):string|null {
  const suffixI = itemId.lastIndexOf(' #');
  if (suffixI <= 0 || !isAsciiDigitSequence(itemId.slice(suffixI + 2))) return null;
  const baseText = itemId.slice(0, suffixI);
  if (baseText.trimEnd() !== baseText) return null;
  return baseText;
}

/** Returns the unsuffixed base ID, excluding nested numbered suffixes. */
export function getNumberedItemBaseId(itemId:string):string|null {
  const baseId = _getBaseBeforeNumberedSuffix(itemId);
  if (baseId === null || _getBaseBeforeNumberedSuffix(baseId) !== null) return null;
  return baseId;
}