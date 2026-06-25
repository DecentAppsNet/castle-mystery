import { describe, expect, it } from 'vitest';

import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { findRightWallPanelSpans } from '../rightWallPanelUtil';
import { MAP_TILE_SIZE } from '../roomGridUtil';
import Rect from '../types/Rect';
import Room, { createDefaultRoom } from '../types/Room';
import rightWallPanelStablesShapeText from './fixtures/right-wall-panel-stables-shape.md?raw';

function _createRoom(id:string, rect:Rect, isOutside:boolean):Room {
  return {
    ...createDefaultRoom(),
    id,
    title:id,
    rect,
    isOutside,
    isDiscovered:true
  };
}

describe('rightWallPanelUtil', () => {
  describe('findRightWallPanelSpans()', () => {
    it('draws no right wall panels for an outside room with no room to the right', () => {
      const room = _createRoom('outside', { x:0, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, true);

      expect(findRightWallPanelSpans(room, [room])).toEqual([]);
    });

    it('draws no right wall panels for an outside room with only outside rooms to the right', () => {
      const room = _createRoom('outside', { x:0, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, true);
      const rightOutsideRoom = _createRoom('outside-2', { x:MAP_TILE_SIZE, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, true);

      expect(findRightWallPanelSpans(room, [room, rightOutsideRoom])).toEqual([]);
    });

    it('draws a right wall panel for an outside room with an inside room to the right', () => {
      const room = _createRoom('outside', { x:0, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, true);
      const rightInsideRoom = _createRoom('inside', { x:MAP_TILE_SIZE, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, false);

      expect(findRightWallPanelSpans(room, [room, rightInsideRoom])).toEqual([
        { topY:0, height:MAP_TILE_SIZE }
      ]);
    });

    it('merges vertically adjacent inside-room stories and leaves gaps unfilled for outside rooms', () => {
      const outsideRoom = _createRoom('outside', { x:0, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE * 4 }, true);
      const upperInsideRoom = _createRoom('inside-top', { x:MAP_TILE_SIZE, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE * 2 }, false);
      const lowerInsideRoom = _createRoom('inside-bottom', { x:MAP_TILE_SIZE, y:MAP_TILE_SIZE * 3, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, false);

      expect(findRightWallPanelSpans(outsideRoom, [outsideRoom, upperInsideRoom, lowerInsideRoom])).toEqual([
        { topY:0, height:MAP_TILE_SIZE * 2 },
        { topY:MAP_TILE_SIZE * 3, height:MAP_TILE_SIZE }
      ]);
    });

    it('draws a full-height panel for inside rooms', () => {
      const room = _createRoom('inside', { x:0, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE * 3 }, false);

      expect(findRightWallPanelSpans(room, [room])).toEqual([
        { topY:0, height:MAP_TILE_SIZE * 3 }
      ]);
    });

    it('does not draw an upper-story panel when only the lower story has an inside room to the right', () => {
      const level = loadLevelFromText(rightWallPanelStablesShapeText, 'right-wall-panel-stables-shape.md');
      const stables = level.rooms.find(room => room.id === 'stables');

      expect(stables).toBeDefined();
      expect(findRightWallPanelSpans(stables!, level.rooms)).toEqual([
        { topY:MAP_TILE_SIZE, height:MAP_TILE_SIZE }
      ]);
    });
  });
});