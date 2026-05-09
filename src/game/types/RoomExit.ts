type RoomExit = Readonly<{
  x:number,
  y:number,
  room1Id:string,
  room2Id:string
}>

export function duplicateRoomExit(from:RoomExit):RoomExit {
  return {...from};
}

export default RoomExit;