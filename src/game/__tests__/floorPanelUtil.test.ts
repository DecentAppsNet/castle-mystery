import { describe, expect, it } from 'vitest';

import { shouldDrawFloorPanelLeftEdge, shouldDrawFloorPanelRightEdge } from '../floorPanelUtil';
import { MAP_TILE_SIZE } from '../roomGridUtil';
import Rect from '../types/Rect';
import Room, { createDefaultRoom } from '../types/Room';

function _createRoom(id:string, rect:Rect, isOutside:boolean):Room {
  return {
    ...createDefaultRoom(),
    id,
    title:id,
    rect,
    isOutside,
  };
}

describe('floorPanelUtil', () => {
  describe('shouldDrawFloorPanelLeftEdge()/shouldDrawFloorPanelRightEdge()', () => {
    it('draws both floor side edges for inside rooms', () => {
      const room = _createRoom('inside', { x:MAP_TILE_SIZE, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, false);

      expect(shouldDrawFloorPanelLeftEdge(room, [room])).toBe(true);
      expect(shouldDrawFloorPanelRightEdge(room, [room])).toBe(true);
    });

    it('draws no floor side edges for an outside room with no adjacent inside rooms', () => {
      const room = _createRoom('outside', { x:MAP_TILE_SIZE, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, true);

      expect(shouldDrawFloorPanelLeftEdge(room, [room])).toBe(false);
      expect(shouldDrawFloorPanelRightEdge(room, [room])).toBe(false);
    });

    it('draws only the left floor edge for an outside room with an inside room on the left', () => {
      const room = _createRoom('outside', { x:MAP_TILE_SIZE, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, true);
      const leftInsideRoom = _createRoom('inside-left', { x:0, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, false);

      expect(shouldDrawFloorPanelLeftEdge(room, [room, leftInsideRoom])).toBe(true);
      expect(shouldDrawFloorPanelRightEdge(room, [room, leftInsideRoom])).toBe(false);
    });

    it('draws only the right floor edge for an outside room with an inside room on the right', () => {
      const room = _createRoom('outside', { x:MAP_TILE_SIZE, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, true);
      const rightInsideRoom = _createRoom('inside-right', { x:MAP_TILE_SIZE * 2, y:0, width:MAP_TILE_SIZE, height:MAP_TILE_SIZE }, false);

      expect(shouldDrawFloorPanelLeftEdge(room, [room, rightInsideRoom])).toBe(false);
      expect(shouldDrawFloorPanelRightEdge(room, [room, rightInsideRoom])).toBe(true);
    });
  });
});