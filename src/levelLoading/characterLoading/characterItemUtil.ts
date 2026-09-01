/* This file resolves character item stubs against complete authored item definitions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Item from "@/game/types/Item";
import { ErrorCollector } from "../errorCollection";
import { MutableCharacter } from "@/game/types/Character";

function _findItemById(items:Item[], itemId:string, errors:ErrorCollector, characterId:string, variableName:String):Item|null {
  const item = items.find(i => i.id === itemId) ?? null;
  if (!item) {
    errors.addAt(`Could not find item in Items section matching "${itemId}".`, 
      ['characters', characterId], `* ${variableName}}=`, itemId);
  }
  return item;
}

/** Replaces character item stubs with matching definitions, reporting missing items. */
export function mergeCharacterItems(characters:MutableCharacter[], items:Item[], errors:ErrorCollector):boolean {
  const originalErrorCount = errors.count;
  characters.forEach(character => {
    for(let itemI = 0; itemI < character.items.length; ++itemI) {
      const itemId = character.items[itemI].id;
      const itemToUse = _findItemById(items, itemId, errors, character.id, 'items');
      if (!itemToUse) continue;
      character.items[itemI] = itemToUse; // Overwrite character item with item instance that has complete item data.
    }
    const leftHandItem = character.leftHandItem;
    if (leftHandItem) character.leftHandItem = _findItemById(items, leftHandItem.id, errors, character.id, 'leftHandItem');
    const rightHandItem = character.rightHandItem;
    if (rightHandItem) character.rightHandItem = _findItemById(items, rightHandItem.id, errors, character.id, 'rightHandItem');
  });
  return errors.count <= originalErrorCount;
}