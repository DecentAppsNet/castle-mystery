import { describe, expect, it } from 'vitest';

import { MAP_TILE_SIZE } from '../roomGridUtil';
import { calcRenderedRoomBounds, calcRenderedRoomsBoundingRect, calcRoomRoofBounds, calcRoomsBoundingRectWithRoofs, findRoofTiles } from '../roomRoofUtil';
import Rect from '../types/Rect';
import Room, { createDefaultRoom } from '../types/Room';

function _createRoom(id:string, rect:Rect):Room {
  return {
    ...createDefaultRoom(),
    id,
    title:id,
    rect,
    isDiscovered:true
  };
}

function _createOutsideRoom(id:string, rect:Rect):Room {
  return {
    ..._createRoom(id, rect),
    isOutside:true
  };
}

describe('roomRoofUtil', () => {
  describe('findRoofTiles()', () => {
    it('creates one roof tile per map tile when no room is above', () => {
      const room = _createRoom('room', { x:0, y:80, width:MAP_TILE_SIZE * 2, height:40 });

      expect(findRoofTiles(room, [room])).toEqual([
        { leftX:0, topY:80, width:MAP_TILE_SIZE },
        { leftX:MAP_TILE_SIZE, topY:80, width:MAP_TILE_SIZE }
      ]);
    });

    it('suppresses only the roof tiles with directly adjacent rooms above', () => {
      const room = _createRoom('room', { x:0, y:80, width:MAP_TILE_SIZE * 2, height:40 });
      const roomAboveLeft = _createRoom('above-left', { x:0, y:60, width:MAP_TILE_SIZE, height:20 });

      expect(findRoofTiles(room, [room, roomAboveLeft])).toEqual([
        { leftX:MAP_TILE_SIZE, topY:80, width:MAP_TILE_SIZE }
      ]);
    });

    it('does not count outside rooms above when deciding whether to suppress a roof tile', () => {
      const room = _createRoom('room', { x:0, y:80, width:MAP_TILE_SIZE * 2, height:40 });
      const outsideRoomAboveLeft = _createOutsideRoom('outside-above-left', { x:0, y:60, width:MAP_TILE_SIZE, height:20 });

      expect(findRoofTiles(room, [room, outsideRoomAboveLeft])).toEqual([
        { leftX:0, topY:80, width:MAP_TILE_SIZE },
        { leftX:MAP_TILE_SIZE, topY:80, width:MAP_TILE_SIZE }
      ]);
    });

    it('suppresses all roof tiles when rooms fully cover the top edge', () => {
      const room = _createRoom('room', { x:0, y:80, width:MAP_TILE_SIZE * 2, height:40 });
      const roomAbove = _createRoom('above', { x:0, y:60, width:MAP_TILE_SIZE * 2, height:20 });

      expect(findRoofTiles(room, [room, roomAbove])).toEqual([]);
    });

    it('does not draw roofs for outside rooms', () => {
      const outsideRoom = _createOutsideRoom('outside', { x:0, y:80, width:MAP_TILE_SIZE * 2, height:40 });
      const insideRoomAbove = _createRoom('above', { x:0, y:60, width:MAP_TILE_SIZE, height:20 });

      expect(findRoofTiles(outsideRoom, [outsideRoom, insideRoomAbove])).toEqual([]);
    });

    it('does not draw roofs for rooms at or below the ground floor', () => {
      const undergroundRoom = _createRoom('underground', { x:0, y:80, width:MAP_TILE_SIZE * 2, height:40 });

      expect(findRoofTiles(undergroundRoom, [undergroundRoom], 80)).toEqual([]);
    });
  });

  describe('calcRoomRoofBounds()', () => {
    it('extends the room upward by the roof peak height when a roof is present', () => {
      const room = _createRoom('room', { x:0, y:80, width:MAP_TILE_SIZE, height:40 });

      expect(calcRoomRoofBounds(room, [room])).toEqual({ x:0, y:76, width:MAP_TILE_SIZE, height:44 });
    });

    it('keeps the original bounds when no roof tiles are present', () => {
      const room = _createRoom('room', { x:0, y:80, width:MAP_TILE_SIZE, height:40 });
      const roomAbove = _createRoom('above', { x:0, y:60, width:MAP_TILE_SIZE, height:20 });

      expect(calcRoomRoofBounds(room, [room, roomAbove])).toEqual(room.rect);
    });
  });

  describe('calcRoomsBoundingRectWithRoofs()', () => {
    it('includes roof overhang in the combined top bound', () => {
      const leftRoom = _createRoom('left', { x:0, y:80, width:MAP_TILE_SIZE, height:40 });
      const rightRoom = _createRoom('right', { x:40, y:100, width:MAP_TILE_SIZE, height:20 });

      expect(calcRoomsBoundingRectWithRoofs([leftRoom, rightRoom])).toEqual({ x:0, y:76, width:60, height:44 });
    });

    it('ignores roof overhang for rooms at or below the ground floor', () => {
      const upperRoom = _createRoom('upper', { x:0, y:60, width:MAP_TILE_SIZE, height:20 });
      const undergroundRoom = _createRoom('underground', { x:0, y:80, width:MAP_TILE_SIZE, height:40 });

      expect(calcRoomsBoundingRectWithRoofs([upperRoom, undergroundRoom], 80)).toEqual({ x:0, y:56, width:MAP_TILE_SIZE, height:64 });
    });
  });

  describe('calcRenderedRoomBounds()', () => {
    it('extends the room roof bounds to include rendered right wall and floor panels', () => {
      const room = _createRoom('room', { x:0, y:80, width:MAP_TILE_SIZE, height:40 });

      expect(calcRenderedRoomBounds(room, [room])).toEqual({ x:0, y:76, width:21.76, height:44.88 });
    });
  });

  describe('calcRenderedRoomsBoundingRect()', () => {
    it('extends the combined roof bounds to include rendered right wall and floor panels', () => {
      const leftRoom = _createRoom('left', { x:0, y:80, width:MAP_TILE_SIZE, height:40 });
      const rightRoom = _createRoom('right', { x:40, y:100, width:MAP_TILE_SIZE, height:20 });

      expect(calcRenderedRoomsBoundingRect([leftRoom, rightRoom])).toEqual({ x:0, y:76, width:61.76, height:44.88 });
    });
  });
});