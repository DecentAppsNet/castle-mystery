/* This module groups helpers that determine whether characters and items are interactive based on authored descriptions.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "./types/Character";
import Item from "./types/Item";

function _hasInteractiveDescription(description:string):boolean {
  return description.trim().length > 0;
}

export function isCharacterInteractive(character:Pick<Character, 'description'>):boolean {
  return _hasInteractiveDescription(character.description);
}

export function isItemInteractive(item:Pick<Item, 'description'>):boolean {
  return _hasInteractiveDescription(item.description);
}