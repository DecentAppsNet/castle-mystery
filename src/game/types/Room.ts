import Rect from "./Rect"
import RoomExit from "./RoomExit"

type Room = {
  id:string,
  title:string,
  rect:Rect,
  exits:RoomExit[],
  isDiscovered:boolean
}

export default Room;