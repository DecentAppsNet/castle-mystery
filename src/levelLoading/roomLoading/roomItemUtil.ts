/* This file validates room legends and places their referenced items, including item stacks.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Item, { MutableItem } from "@/game/types/Item";
import Room from "@/game/types/Room";
import { ErrorCollector } from "../errorCollection";
import { getUniqueIdsFromLegendGrid, parseLegendGrid } from "./legendGridUtil";
import LegendGrid from "./types/LegendGrid";
import { calcFloorSquareCenter } from "@/game/squareUtil";
import { resolveItemDefinition } from "../itemLoading";
import ItemPlacementById from "./types/ItemPlacementById";

function _findItemById(items:MutableItem[], itemId:string):MutableItem|null {
  return items.find(i => i.id === itemId) ?? null;
}

function _areAllLegendIdsValidReferences(roomLegendGrid:LegendGrid, items:MutableItem[],
    availableCharacterIds:string[], errors:ErrorCollector, roomId:string):boolean {
  const originalErrorCount = errors.count;
  const ids:string[] = getUniqueIdsFromLegendGrid(roomLegendGrid);
  ids.forEach(id => {
    if (!availableCharacterIds.includes(id) && !resolveItemDefinition(items, id)) {
      errors.addAt(`"${id}" referenced in legend for "${roomId}" room does not have a definition in "items" or "characters" sections.`,
        ['rooms', roomId], '```');
    }
  });
  return errors.count <= originalErrorCount;
}

/** Validates room legend references and positions the room's item definitions. */
export function createItemsForRoom(room:Room, items:MutableItem[], availableCharacterIds:string[], roomSectionText:string,
  placements:ItemPlacementById, roomName:string, errors:ErrorCollector):Item[] {
  // Validate the grid and resolve its item references before assigning any positions for this room.
  const itemsResult:Item[] = [];
  const roomLegendGrid = parseLegendGrid(roomSectionText, errors, ['rooms', room.id]);
  if (!roomLegendGrid || !roomLegendGrid.entries.length) return [];
  if (!_areAllLegendIdsValidReferences(roomLegendGrid, items, availableCharacterIds, errors, room.id)) return [];

  roomLegendGrid.entries.forEach(entry => { 
    // Process item entries in grid and stack order; character-only references are placed elsewhere.
    const { col, row, id } = entry;
    const itemToUse = _findItemById(items, id);
    if (!itemToUse) return;

    // The registry spans this load's rooms. Reject repeated IDs before overwriting their first position.
    const firstPlacement = placements[id];
    if (firstPlacement) {
      errors.addAt(`Item "${id}" has duplicate initial placement in room "${roomName}" at column ${col + 1}, row ${row + 1}. `
        + `First placed in room "${firstPlacement.roomName}" at column ${firstPlacement.col + 1}, row ${firstPlacement.row + 1}. `
        + 'Use separate numbered IDs for separate objects.', ['rooms', room.id], '```');
      return;
    }

    // Record ownership and assign the floor position, reusing the definition as this concrete item.
    placements[id] = { roomName, col, row };
    itemToUse.position = calcFloorSquareCenter(room.rect, col, row); // Intentional side effect.
    itemsResult.push(itemToUse); // Intentional reuse of same instance.
  });
  return itemsResult;
}