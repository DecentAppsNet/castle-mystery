import Item from "@/game/types/Item";
import Room from "@/game/types/Room";
import ErrorCollector from "../errorCollection/ErrorCollector";

function _findItemById(items:Item[], itemId:string):Item|null {
  return items.find(i => i.id === itemId) ?? null;
}

export function mergeRoomItems(rooms:Room[], items:Item[], errors:ErrorCollector):boolean {
  const originalErroCount = errors.errorCount;
  rooms.forEach(room => {
    for(let itemI = 0; itemI < items.length; ++itemI) {
      const itemId = items[itemI].id;
      const itemToUse = _findItemById(items, itemId);
      if (!itemToUse) {
        errors.addParseErrorAtLine(`NOLEGITEM`, `item in Items section matching "${itemId}"`, `no matching Item found`, 
          `Make sure are items referenced by "${room.id}" have a corresponding item defined in "Items" section.`, 0, 0, 0, 'items');
        continue;
      }
      itemToUse.position = items[itemI].position; // We only need the position from the stub item.
      items[itemI] = itemToUse; // Overwrite room item with item instance that has complete item data.
    }
  });
  return errors.errorCount <= originalErroCount;
}