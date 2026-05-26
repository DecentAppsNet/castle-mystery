import Rect from "./Rect"
import Item, { duplicateItem } from "./Item"
import RoomExit, { duplicateRoomExit } from "./RoomExit"
import StairFlight, { duplicateStairFlight } from "./StairFlight"
import Waypoint, { duplicateWaypoint } from "./Waypoint"

type Room = {
  readonly id:string,
  readonly title:string,
  readonly rect:Rect,
  readonly isObscured:boolean,
  items:Item[],
  readonly exits:RoomExit[],
  readonly stairs:StairFlight[],
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
    exits:from.exits.map(duplicateRoomExit),
    stairs:from.stairs.map(duplicateStairFlight),
    waypoints:from.waypoints.map(duplicateWaypoint),
    isDiscovered:from.isDiscovered
  }
}

export default Room;