import Item from "@/game/types/Item";
import Room from "@/game/types/Room";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { COLUMN_WIDTH } from "@/game/roomGridUtil";
import { ROOM_ROW_DEPTH } from "@/game/roomSpaceConstants";
import { getUniqueIdsFromLegendGrid, parseLegendGrid } from "./legendGridUtil";
import Position from "@/game/types/Position";
import LegendGrid from "./types/LegendGrid";

function _findItemById(items:Item[], itemId:string):Item|null {
  return items.find(i => i.id === itemId) ?? null;
}

function _getRoomItemPosition(room:Room, col:number, row:number):Position {
  const x = room.rect.x + col * COLUMN_WIDTH;
  const y = room.rect.y + room.rect.height;
  const z = row * ROOM_ROW_DEPTH;
  return {x, y, z};
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

export function createItemsForRoom(room:Room, items:Item[], availableCharacterIds:string[], roomSectionText:string, errors:ErrorCollector):Item[] {
  const itemsResult:Item[] = [];
  const roomLegendGrid = parseLegendGrid(roomSectionText, errors, ['rooms', room.id]);
  if (!roomLegendGrid || !roomLegendGrid.entries.length) return [];
  const availableItemIds:string[] = items.map(item => item.id);
  if (!_areAllLegendIdsValidReferences(roomLegendGrid, availableItemIds, availableCharacterIds, errors, room.id)) return [];
  roomLegendGrid.entries.forEach(entry => { 
    const { col, row, id } = entry;
    const itemToUse = _findItemById(items, id);
    if (!itemToUse) return;
    itemToUse.position = _getRoomItemPosition(room, col, row); // Intentional side effect.
    itemsResult.push(itemToUse); // Intentional reuse of same instance.
  });
  return itemsResult;
}