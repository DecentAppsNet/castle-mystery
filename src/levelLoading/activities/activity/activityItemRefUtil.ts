/* This module groups shared item-reference matching helpers used by activity loading utilities.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Item from "@/game/types/Item";
import { normalizeId } from "@/game/idUtil";

export function matchesItemReference(item:Item, reference:string):boolean {
  const normalizedReference = normalizeId(reference);
  return item.id === normalizedReference || normalizeId(item.title) === normalizedReference;
}