// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { describeExit } from '../exitUtil';
import ExitStatus from '../types/ExitStatus';
import ExitType from '../types/ExitType';
import Item from '../types/Item';
import Room from '../types/Room';
import RoomExit, { LOCKABLE_WITHOUT_INV_CHECK } from '../types/RoomExit';

function _createRoom(id:string, title:string):Room {
  return {
    id,
    title,
    rect:{ x:0, y:0, width:10, height:10 },
    isOutside:false,
    isObscured:false,
    items:[],
    exits:[],
    stairParts:[],
    waypoints:[],
    isDiscovered:true
  };
}

function _createExit(lockableFromRoom1With:string|null):RoomExit {
  return {
    id:'bedroom|hallway|5|0',
    x:5,
    y:0,
    room1Id:'bedroom',
    room2Id:'hallway',
    exitType:ExitType.lockableDoor,
    lockableFromRoom1With,
    lockableFromRoom2With:null,
    exitStatus:ExitStatus.locked
  };
}

describe('exitUtil', () => {
  describe('describeExit()', () => {
    it('uses the indexed item title for lockable exits with specific item requirements', () => {
      const room1 = _createRoom('bedroom', 'Bedroom');
      const room2 = _createRoom('hallway', 'Hallway');
      const itemsById = new Map<string, Item>([['red key', {
        id:'red key',
        title:'Iron Key',
        displayChar:'I',
        position:{ x:0, y:0, z:0.5 },
        description:'Opens the bedroom.',
        isDiscovered:false,
        isExamined:false
      }]]);

      expect(describeExit(_createExit('red key'), room1, room2, itemsById)).toBe('This locked door can be unlocked from Bedroom with Iron Key.');
    });

    it('keeps generic key wording when no specific item is required', () => {
      const room1 = _createRoom('bedroom', 'Bedroom');
      const room2 = _createRoom('hallway', 'Hallway');

      expect(describeExit(_createExit(LOCKABLE_WITHOUT_INV_CHECK), room1, room2, new Map())).toBe('This locked door can be unlocked from Bedroom.');
    });
  });
});