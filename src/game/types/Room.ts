import Rect from "./Rect"
import Item, { duplicateItem } from "./Item"
import RoomExit, { duplicateRoomExit } from "./RoomExit"
import StairPart, { duplicateStairPart } from "./StairPart"
import Texture, { duplicateTexture } from "./Texture"
import Waypoint, { duplicateWaypoint } from "./Waypoint"

type Room = {
  readonly id:string,
  readonly title:string,
  readonly rect:Rect,
  readonly isOutside:boolean,
  readonly backWallTexture:Texture|null,
  readonly floorTexture:Texture|null,
  readonly rightWallTexture:Texture|null,
  isObscured:boolean,
  items:Item[],
  readonly exits:RoomExit[],
  readonly stairParts:StairPart[],
  readonly waypoints:Waypoint[],
  isDiscovered:boolean
}

export function createDefaultRoom():Room {
  return {
    id:'room',
    title:'Room',
    rect:{ x:0, y:0, width:10, height:10 },
    isOutside:false,
    backWallTexture:null,
    floorTexture:null,
    rightWallTexture:null,
    isObscured:false,
    items:[],
    exits:[],
    stairParts:[],
    waypoints:[],
    isDiscovered:false
  };
}

export function duplicateRoom(from:Room):Room {
  return {
    id:from.id,
    title:from.title,
    rect:from.rect,
    isOutside:from.isOutside,
    backWallTexture:from.backWallTexture ? duplicateTexture(from.backWallTexture) : null,
    floorTexture:from.floorTexture ? duplicateTexture(from.floorTexture) : null,
    rightWallTexture:from.rightWallTexture ? duplicateTexture(from.rightWallTexture) : null,
    isObscured:from.isObscured,
    items:from.items.map(duplicateItem),
    exits:from.exits.map(duplicateRoomExit),
    stairParts:from.stairParts.map(duplicateStairPart),
    waypoints:from.waypoints.map(duplicateWaypoint),
    isDiscovered:from.isDiscovered
  }
}

export default Room;