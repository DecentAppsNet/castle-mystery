import Item from "@/game/types/Item";
import Room from "@/game/types/Room";
import ErrorCollector from "../errorCollection/ErrorCollector";

function _findItemById(items:Item[], itemId:string):Item|null {
  return items.find(i => i.id === itemId) ?? null;
}

export function mergeRoomItems(rooms:Room[], items:Item[], errors:ErrorCollector):boolean {
  const originalErrorCount = errors.count;
  rooms.forEach(room => {
    for(let itemI = 0; itemI < room.items.length; ++itemI) {
      const itemId = room.items[itemI].id;
      const itemToUse = _findItemById(items, itemId);
      if (!itemToUse) {
        errors.addAt(`Could not find item in Items section matching "${itemId}".`, ['rooms', room.id], `* items=`, itemId);
        continue;
      }
      itemToUse.position = items[itemI].position; // We only need the position from the stub item.
      room.items[itemI] = itemToUse; // Overwrite room item with item instance that has complete item data.
    }
  });
  return errors.count <= originalErrorCount;
}