/* This module validates room legends and places their referenced items, including item stacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Item, { MutableItem } from "@/game/types/Item";
import Room from "@/game/types/Room";
import { ErrorCollector } from "../errorCollection";
import { getUniqueIdsFromLegendGrid, parseLegendGrid } from "./legendGridUtil";
import LegendGrid from "./types/LegendGrid";
import { calcFloorSquareCenter } from "@/game/squareUtil";

function _findItemById(items:MutableItem[], itemId:string):MutableItem|null {
  return items.find(i => i.id === itemId) ?? null;
}

function _areAllLegendIdsValidReferences(roomLegendGrid:LegendGrid, availableItemIds:string[], 
    availableCharacterIds:string[], errors:ErrorCollector, roomId:string):boolean {
  const originalErrorCount = errors.count;
  const ids:string[] = getUniqueIdsFromLegendGrid(roomLegendGrid);
  ids.forEach(id => {
    if (!availableItemIds.includes(id) && !availableCharacterIds.includes(id)) {
      errors.addAt(`"${id}" referenced in legend for "${roomId}" room does not have a definition in "items" or "characters" sections.`,
        ['rooms', roomId], '```');
    }
  });
  return errors.count <= originalErrorCount;
}

export function createItemsForRoom(room:Room, items:MutableItem[], availableCharacterIds:string[], roomSectionText:string, errors:ErrorCollector):Item[] {
  const itemsResult:Item[] = [];
  const roomLegendGrid = parseLegendGrid(roomSectionText, errors, ['rooms', room.id]);
  if (!roomLegendGrid || !roomLegendGrid.entries.length) return [];
  const availableItemIds:string[] = items.map(item => item.id);
  if (!_areAllLegendIdsValidReferences(roomLegendGrid, availableItemIds, availableCharacterIds, errors, room.id)) return [];
  roomLegendGrid.entries.forEach(entry => { 
    const { col, row, id } = entry;
    const itemToUse = _findItemById(items, id);
    if (!itemToUse) return;
    itemToUse.position = calcFloorSquareCenter(room.rect, col, row); // Intentional side effect.
    itemsResult.push(itemToUse); // Intentional reuse of same instance.
  });
  return itemsResult;
}