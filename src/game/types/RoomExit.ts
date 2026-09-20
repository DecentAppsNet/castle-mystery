import { assert } from 'decent-portal';

import ExitStatus from './ExitStatus';
import ExitType from './ExitType';

export const LOCKABLE_WITHOUT_INV_CHECK = '*';

type RoomExit = {
  readonly id:string,
  readonly x:number,
  readonly y:number,
  readonly room1Id:string,
  readonly room2Id:string,
  readonly exitType:ExitType,
  readonly lockableFromRoom1With:string|null,
  readonly lockableFromRoom2With:string|null,
  exitStatus:ExitStatus
}

export function createRoomExitId(room1Id:string, room2Id:string, x:number, y:number):string {
  return `${room1Id}|${room2Id}|${x}|${y}`;
}

export function duplicateRoomExit(from:RoomExit):RoomExit {
  return {...from};
}

export function areRoomExitsEqual(a:RoomExit, b:RoomExit):boolean {
  if (a === b) return true;
  assert(a.id !== b.id || (a.x === b.x && a.y === b.y && a.room1Id === b.room1Id && a.room2Id === b.room2Id &&
      a.exitType === b.exitType && a.lockableFromRoom1With === b.lockableFromRoom1With && 
      a.lockableFromRoom2With === b.lockableFromRoom2With)); // Should never have instance with same ID but different readonly members.
  return (a.id === b.id && a.exitStatus === b.exitStatus);
}

export default RoomExit;