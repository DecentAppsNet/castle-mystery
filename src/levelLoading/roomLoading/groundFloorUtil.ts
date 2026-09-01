/* This file resolves ground-floor height and validates outside-room placement against it.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calcRoomsBoundingRect, findRoomByIdOrTitle } from "@/game/roomUtil";
import Room from "@/game/types/Room";
import { ErrorCollector } from "../errorCollection";

function _calcDefaultGroundFloorY(rooms:Room[]) {
  const roomBounds = calcRoomsBoundingRect(rooms);
  return roomBounds.y + roomBounds.height;
}

/** Resolves ground-floor height from an authored room reference or the lowest room. */
export function findGroundFloorY(rooms:Room[], groundFloorRoomRef:string|null, errors:ErrorCollector):number {
  if (!groundFloorRoomRef) return _calcDefaultGroundFloorY(rooms);
  const groundFloorRoom = findRoomByIdOrTitle(rooms, groundFloorRoomRef);
  if (!groundFloorRoom) {
    errors.addAt(`"${groundFloorRoomRef}" does not match a defined room.`, 'general', '* groundFloorRoom=', groundFloorRoomRef);
    return _calcDefaultGroundFloorY(rooms);
  }
  return groundFloorRoom.rect.y + groundFloorRoom.rect.height;
}

/** Reports outside rooms whose floors fall below the ground floor. */
export function validateOutsideRoomsAgainstGroundFloor(rooms:Room[], groundFloorRoomRef:string|null, groundFloorY:number, errors:ErrorCollector):boolean {
  if (!groundFloorRoomRef) return true;
  const undergroundOutsideRoom = rooms.find(room => room.isOutside && room.rect.y >= groundFloorY) || null;
  if (!undergroundOutsideRoom) return true;
  const roomName = undergroundOutsideRoom.title || undergroundOutsideRoom.id;
  errors.addAt(`outside room "${roomName}" is below the ground floor room.`, 'general', '* groundFloorRoom=', groundFloorRoomRef);
  return false;
}