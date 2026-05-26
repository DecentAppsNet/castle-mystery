import Rect from "./Rect"
import Item, { duplicateItem } from "./Item"
import RoomExit, { duplicateRoomExit } from "./RoomExit"
import Waypoint, { duplicateWaypoint } from "./Waypoint"

type Room = {
  readonly id:string,
  readonly title:string,
  readonly rect:Rect,
  readonly isObscured:boolean,
  items:Item[],
  readonly exits:RoomExit[],
  readonly waypoints:Waypoint[],
  isDiscovered:boolean
}

export function duplicateRoom(from:Room):Room {
  return {
    id:from.id,
    title:from.title,
    rect:from.rect,
    isObscured:from.isObscured,
    items:from.items.map(duplicateItem),
    waypoints:from.waypoints.map(duplicateWaypoint),
    exits:from.exits.map(duplicateRoomExit),
    isDiscovered:from.isDiscovered
  }
}

export default Room;