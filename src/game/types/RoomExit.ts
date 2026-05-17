import ExitStatus from './ExitStatus';
import ExitType from './ExitType';

type RoomExit = {
  readonly x:number,
  readonly y:number,
  readonly room1Id:string,
  readonly room2Id:string,
  readonly exitType:ExitType,
  readonly isLockableFromRoom1:boolean,
  readonly isLockableFromRoom2:boolean,
  exitStatus:ExitStatus
}

export function duplicateRoomExit(from:RoomExit):RoomExit {
  return {...from};
}

export default RoomExit;