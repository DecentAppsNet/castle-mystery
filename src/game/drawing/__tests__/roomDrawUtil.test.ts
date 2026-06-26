import { describe, expect, it } from 'vitest';

import { drawRoomShellExits } from '../roomDrawUtil';
import { createDefaultRoom } from '@/game/types/Room';
import type ScalingFactors from '@/game/types/ScalingFactors';
import ExitStatus from '@/game/types/ExitStatus';
import ExitType from '@/game/types/ExitType';

const SCALING_FACTORS:ScalingFactors = {
  sourceX:0,
  sourceY:0,
  sourceWidth:100,
  sourceHeight:100,
  scaleX:10,
  translateX:0,
  scaleY:10,
  translateY:0,
  roomFontHeight:12,
  roomLineWidth:2,
  destWidth:1000,
  destHeight:1000
};

describe('roomDrawUtil', () => {
  describe('drawRoomShellExits()', () => {
    it('does not mark or draw exits for undiscovered rooms', () => {
      const room = {
        ...createDefaultRoom(),
        id:'room-a',
        isDiscovered:false,
        exits:[{
          id:'room-a|room-b|10|5',
          x:10,
          y:5,
          room1Id:'room-a',
          room2Id:'room-b',
          exitType:ExitType.door,
          lockableFromRoom1With:null,
          lockableFromRoom2With:null,
          exitStatus:ExitStatus.open
        }],
        rect:{ x:0, y:0, width:10, height:10 }
      };
      const adjacentRoom = {
        ...createDefaultRoom(),
        id:'room-b',
        isDiscovered:true,
        rect:{ x:10, y:0, width:10, height:10 }
      };
      const drawnExitIds = new Set<string>();

      drawRoomShellExits(
        room,
        [room, adjacentRoom],
        [],
        drawnExitIds,
        SCALING_FACTORS,
        {} as CanvasRenderingContext2D
      );

      expect(drawnExitIds.size).toBe(0);
    });
  });
});