/* This module groups the room-exit model, exit-id creation, and room-exit duplication helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

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

export default RoomExit;