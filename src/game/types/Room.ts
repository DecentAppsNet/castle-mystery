import Rect from "./Rect"
import Item, { duplicateItem } from "./Item"
import RoomExit, { duplicateRoomExit } from "./RoomExit"
import StairPart, { duplicateStairPart } from "./StairPart"
import Texture, { duplicateTexture } from "./Texture"
import Waypoint, { duplicateWaypoint } from "./Waypoint"

export type MutableRoom = {
  readonly id:string,
  readonly title:string,
  readonly rect:Rect,
  readonly isOutside:boolean,
  readonly backWallTexture:Texture|null,
  readonly floorTexture:Texture|null,
  readonly stairTexture:Texture|null,
  readonly doorTexture:Texture|null,
  readonly rightWallTexture:Texture|null,
  items:Item[],
  readonly exits:RoomExit[],
  readonly stairParts:StairPart[],
  readonly waypoints:Waypoint[]
}

type Room = Readonly<MutableRoom>;

export function createDefaultRoom():Room {
  return {
    id:'room',
    title:'Room',
    rect:{ x:0, y:0, width:10, height:10 },
    isOutside:false,
    backWallTexture:null,
    floorTexture:null,
    stairTexture:null,
    doorTexture:null,
    rightWallTexture:null,
    items:[],
    exits:[],
    stairParts:[],
    waypoints:[]
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
    stairTexture:from.stairTexture ? duplicateTexture(from.stairTexture) : null,
    doorTexture:from.doorTexture ? duplicateTexture(from.doorTexture) : null,
    rightWallTexture:from.rightWallTexture ? duplicateTexture(from.rightWallTexture) : null,
    items:from.items.map(duplicateItem),
    exits:from.exits.map(duplicateRoomExit),
    stairParts:from.stairParts.map(duplicateStairPart),
    waypoints:from.waypoints.map(duplicateWaypoint)
  }
}

export default Room;