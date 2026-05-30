import Rect from "./Rect"
import Item, { duplicateItem } from "./Item"
import RoomExit, { duplicateRoomExit } from "./RoomExit"
import StairPart, { duplicateStairPart } from "./StairPart"
import Waypoint, { duplicateWaypoint } from "./Waypoint"

type Room = {
  readonly id:string,
  readonly title:string,
  readonly rect:Rect,
  readonly isOutside:boolean,
  readonly isObscured:boolean,
  items:Item[],
  readonly exits:RoomExit[],
  readonly stairParts:StairPart[],
  readonly waypoints:Waypoint[],
  isDiscovered:boolean
}

export function duplicateRoom(from:Room):Room {
  return {
    id:from.id,
    title:from.title,
    rect:from.rect,
    isOutside:from.isOutside,
    isObscured:from.isObscured,
    items:from.items.map(duplicateItem),
    exits:from.exits.map(duplicateRoomExit),
    stairParts:from.stairParts.map(duplicateStairPart),
    waypoints:from.waypoints.map(duplicateWaypoint),
    isDiscovered:from.isDiscovered
  }
}

export default Room;