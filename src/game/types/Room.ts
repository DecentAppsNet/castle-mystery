import Rect from "./Rect"
import Item, { duplicateItem } from "./Item"
import Obstruction, { duplicateObstruction } from "./Obstruction"
import RoomExit, { duplicateRoomExit } from "./RoomExit"

type Room = {
  id:string,
  title:string,
  rect:Rect,
  items:Item[],
  obstructions:Obstruction[],
  exits:RoomExit[],
  isDiscovered:boolean
}

export function duplicateRoom(from:Room):Room {
  return {
    id:from.id,
    title:from.title,
    rect:from.rect,
    items:from.items.map(duplicateItem),
    obstructions:from.obstructions.map(duplicateObstruction),
    exits:from.exits.map(duplicateRoomExit),
    isDiscovered:from.isDiscovered
  }
}

export default Room;