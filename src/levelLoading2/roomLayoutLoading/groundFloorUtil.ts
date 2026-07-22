import { calcRoomsBoundingRect, findRoomByIdOrTitle } from "@/game/roomUtil";
import Room from "@/game/types/Room";
import ErrorCollector from "../errorCollection/ErrorCollector";

function _calcDefaultGroundFloorY(rooms:Room[]) {
  const roomBounds = calcRoomsBoundingRect(rooms);
  return roomBounds.y + roomBounds.height;
}

export function findGroundFloorY(rooms:Room[], groundFloorRoomRef:string|null, errors:ErrorCollector):number {
  if (!groundFloorRoomRef) return _calcDefaultGroundFloorY(rooms);
  const groundFloorRoom = findRoomByIdOrTitle(rooms, groundFloorRoomRef);
  if (!groundFloorRoom) {
    errors.addParseErrorAtLine('BADROOMREF', `general groundFloorRoom "${groundFloorRoomRef}" matches a defined room`, 'did not match', 
      'Fix to match one of the rooms in "rooms" section.', 0, 0, 0, 'general');
     return _calcDefaultGroundFloorY(rooms);
  }
  return groundFloorRoom.rect.y + groundFloorRoom.rect.height;
}

export function validateOutsideRoomsAgainstGroundFloor(rooms:Room[], groundFloorRoomRef:string|null, groundFloorY:number, errors:ErrorCollector):boolean {
  if (!groundFloorRoomRef) return true;
  const undergroundOutsideRoom = rooms.find(room => room.isOutside && room.rect.y >= groundFloorY) || null;
  if (!undergroundOutsideRoom) return true;
  errors.addParseError('OUTSIDEUNDER', 'all outside rooms to be at or above ground floor',
    `outside room '${undergroundOutsideRoom.title || undergroundOutsideRoom.id}' is below general groundFloorRoom '${groundFloorRoomRef}'`,
    `You can move the room, make it an inside room (underground), or lower the ground floor to match this room.`, 0, 0);
  return false;
}