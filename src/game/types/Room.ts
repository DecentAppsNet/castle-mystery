import Rect from "./Rect"
import RoomExit, { duplicateRoomExit } from "./RoomExit"

type Room = {
  id:string,
  title:string,
  rect:Rect,
  exits:RoomExit[],
  isDiscovered:boolean
}

export function duplicateRoom(from:Room):Room {
  return {
    id:from.id,
    title:from.title,
    rect:from.rect,
    exits:from.exits.map(duplicateRoomExit),
    isDiscovered:from.isDiscovered
  }
}

export default Room;