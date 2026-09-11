// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createDefaultCharacterKeyframe } from '@/game/types/CharacterKeyframe';
import Position from '@/game/types/Position';
import { createDefaultRoom } from '@/game/types/Room';
import RoomExit from '@/game/types/RoomExit';
import TimelineKeyframe from '@/game/types/TimelineKeyframe';
import { generateRoomEntryEvents } from '../roomEntranceUtil';

function _createKeyframe(time:number, positions:Position[]):TimelineKeyframe {
  return {
    time,
    characters:positions.map(position => ({ ...createDefaultCharacterKeyframe(), position })),
    rooms:[]
  };
}

const WEST_CENTER_EXIT:RoomExit = {
  id:'west-center', x:10, y:5, room1Id:'west', room2Id:'center',
  exitType:'doorway', exitStatus:'open', lockableFromRoom1With:null, lockableFromRoom2With:null
};
const CENTER_EAST_EXIT:RoomExit = {
  id:'center-east', x:20, y:5, room1Id:'center', room2Id:'east',
  exitType:'doorway', exitStatus:'open', lockableFromRoom1With:null, lockableFromRoom2With:null
};

const ROOMS = [
  { ...createDefaultRoom(), id:'west', rect:{ x:0, y:0, width:10, height:10 }, exits:[WEST_CENTER_EXIT] },
  { ...createDefaultRoom(), id:'center', rect:{ x:10, y:0, width:10, height:10 }, exits:[WEST_CENTER_EXIT, CENTER_EAST_EXIT] },
  { ...createDefaultRoom(), id:'east', rect:{ x:20, y:0, width:10, height:10 }, exits:[CENTER_EAST_EXIT] }
];

const _position = (x:number, y = 5, z = 0):Position => ({ x, y, z });

describe('roomEntranceUtil', () => {
  describe('generateRoomEntryEvents()', () => {
    it('includes each character initial room at the first keyframe time', () => {
      const keyframes = [_createKeyframe(100, [_position(5), _position(25)])];

      expect(generateRoomEntryEvents(keyframes, ROOMS)).toEqual([
        [{ roomId:'west', time:100 }],
        [{ roomId:'east', time:100 }]
      ]);
    });

    it('does not add an entrance for movement within one room', () => {
      const keyframes = [
        _createKeyframe(0, [_position(2)]),
        _createKeyframe(1000, [_position(8)])
      ];

      expect(generateRoomEntryEvents(keyframes, ROOMS)[0]).toEqual([
        { roomId:'west', time:0 }
      ]);
    });

    it('calculates entrances through multiple rooms while moving right', () => {
      const keyframes = [
        _createKeyframe(0, [_position(5)]),
        _createKeyframe(2000, [_position(25)])
      ];

      expect(generateRoomEntryEvents(keyframes, ROOMS)[0]).toEqual([
        { roomId:'west', time:0 },
        { roomId:'center', time:500 },
        { roomId:'east', time:1500 }
      ]);
    });

    it('calculates entrances through multiple rooms while moving left', () => {
      const keyframes = [
        _createKeyframe(0, [_position(25)]),
        _createKeyframe(2000, [_position(5)])
      ];

      expect(generateRoomEntryEvents(keyframes, ROOMS)[0]).toEqual([
        { roomId:'east', time:0 },
        { roomId:'center', time:500 },
        { roomId:'west', time:1500 }
      ]);
    });

    it('does not infer room entrances from non-horizontal movement', () => {
      const keyframes = [
        _createKeyframe(0, [_position(5)]),
        _createKeyframe(1000, [_position(25, 6)])
      ];

      expect(generateRoomEntryEvents(keyframes, ROOMS)[0]).toEqual([
        { roomId:'west', time:0 }
      ]);
    });
  });
});
