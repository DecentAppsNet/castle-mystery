import Rect from "./Rect"
import Item, { duplicateItem } from "./Item"
import Obstruction, { duplicateObstruction } from "./Obstruction"
import RoomExit, { duplicateRoomExit } from "./RoomExit"
import Waypoint, { duplicateWaypoint } from "./Waypoint"

type Room = {
  readonly id:string,
  readonly title:string,
  readonly rect:Rect,
  items:Item[],
  readonly obstructions:Obstruction[],
  readonly exits:RoomExit[],
  readonly waypoints:Waypoint[],
  isDiscovered:boolean
}

export function duplicateRoom(from:Room):Room {
  return {
    id:from.id,
    title:from.title,
    rect:from.rect,
    items:from.items.map(duplicateItem),
    obstructions:from.obstructions.map(duplicateObstruction),
    waypoints:from.waypoints.map(duplicateWaypoint),
    exits:from.exits.map(duplicateRoomExit),
    isDiscovered:from.isDiscovered
  }
}

export default Room;