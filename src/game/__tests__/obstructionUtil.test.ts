// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import {
  CHARACTER_OBSTRUCTION_MARGIN,
  clipMoveToObstructions,
  createObstruction,
  createObstructionBoundaryCorners,
  createObstructionBoundarySegments,
  isPositionInObstructions,
  isPositionInRect,
  isPositionInRoomObstruction
} from '../obstructionUtil';
import Obstruction from '../types/Obstruction';
import Position from '../types/Position';
import Rect from '../types/Rect';
import Room from '../types/Room';

function _createRoom(obstructions:Obstruction[] = []):Room {
  return {
    id:'Room',
    title:'Room',
    rect:{ x:0, y:0, width:40, height:40 },
    items:[],
    obstructions,
    exits:[],
    waypoints:[],
    positionMarkersById:{},
    isDiscovered:false,
    isObscured:false
  };
}

function _sortPositions(positions:Position[]):Position[] {
  return [...positions].sort((position1, position2) => position1.x - position2.x || position1.y - position2.y);
}

function _normalizeSegment(segment:{ start:Position, end:Position }) {
  const points = _sortPositions([segment.start, segment.end]);
  return `${points[0].x},${points[0].y}->${points[1].x},${points[1].y}`;
}

describe('obstructionUtil', () => {
  describe('isPositionInRect()', () => {
    it('includes the left/top edges and excludes the right/bottom edges', () => {
      const rect:Rect = { x:10, y:20, width:5, height:4 };

      expect(isPositionInRect(10, 20, rect)).toBe(true);
      expect(isPositionInRect(14, 23, rect)).toBe(true);
      expect(isPositionInRect(15, 20, rect)).toBe(false);
      expect(isPositionInRect(10, 24, rect)).toBe(false);
    });
  });

  describe('createObstruction()', () => {
    it('filters empty rects and merges touching horizontal rects', () => {
      const obstruction = createObstruction([
        { x:0, y:0, width:2, height:3 },
        { x:2, y:0, width:3, height:3 },
        { x:10, y:10, width:0, height:5 }
      ]);

      expect(obstruction.rects).toEqual([{ x:0, y:0, width:5, height:3 }]);
    });

    it('merges touching vertical rects', () => {
      const obstruction = createObstruction([
        { x:4, y:1, width:2, height:3 },
        { x:4, y:4, width:2, height:2 }
      ]);

      expect(obstruction.rects).toEqual([{ x:4, y:1, width:2, height:5 }]);
    });
  });

  describe('createObstructionBoundarySegments()', () => {
    it('returns the four perimeter segments for a single rectangle obstruction', () => {
      const obstruction = createObstruction([{ x:2, y:3, width:4, height:5 }]);

      expect(createObstructionBoundarySegments(obstruction).map(_normalizeSegment).sort()).toEqual([
        '2,3->2,8',
        '2,3->6,3',
        '2,8->6,8',
        '6,3->6,8'
      ]);
    });

    it('omits internal seams for merged rect shapes', () => {
      const obstruction = createObstruction([
        { x:0, y:0, width:4, height:2 },
        { x:2, y:2, width:2, height:2 }
      ]);

      expect(createObstructionBoundarySegments(obstruction).map(_normalizeSegment).sort()).toEqual([
        '0,0->0,2',
        '0,0->4,0',
        '0,2->2,2',
        '2,2->2,4',
        '2,4->4,4',
        '4,0->4,4'
      ]);
    });

    it('keeps separate horizontal boundary ranges for disjoint rectangles on the same rows', () => {
      const obstruction = createObstruction([
        { x:0, y:0, width:2, height:2 },
        { x:4, y:0, width:2, height:2 }
      ]);

      expect(createObstructionBoundarySegments(obstruction).map(_normalizeSegment).sort()).toEqual([
        '0,0->0,2',
        '0,0->2,0',
        '0,2->2,2',
        '2,0->2,2',
        '4,0->4,2',
        '4,0->6,0',
        '4,2->6,2',
        '6,0->6,2'
      ]);
    });

    it('keeps separate vertical boundary ranges for disjoint rectangles in the same columns', () => {
      const obstruction = createObstruction([
        { x:0, y:0, width:2, height:2 },
        { x:0, y:4, width:2, height:2 }
      ]);

      expect(createObstructionBoundarySegments(obstruction).map(_normalizeSegment).sort()).toEqual([
        '0,0->0,2',
        '0,0->2,0',
        '0,2->2,2',
        '0,4->0,6',
        '0,4->2,4',
        '0,6->2,6',
        '2,0->2,2',
        '2,4->2,6'
      ]);
    });
  });

  describe('createObstructionBoundaryCorners()', () => {
    it('returns unique outer corners of the obstruction boundary', () => {
      const obstruction = createObstruction([
        { x:0, y:0, width:4, height:2 },
        { x:2, y:2, width:2, height:2 }
      ]);

      expect(_sortPositions(createObstructionBoundaryCorners(obstruction))).toEqual([
        { x:0, y:0 },
        { x:0, y:2 },
        { x:2, y:2 },
        { x:2, y:4 },
        { x:4, y:0 },
        { x:4, y:4 }
      ]);
    });
  });

  describe('isPositionInObstructions()', () => {
    it('returns whether a position lies inside any obstruction', () => {
      const obstructions = [
        createObstruction([{ x:2, y:2, width:3, height:3 }]),
        createObstruction([{ x:10, y:10, width:2, height:2 }])
      ];

      expect(isPositionInObstructions(3, 3, obstructions)).toBe(true);
      expect(isPositionInObstructions(10, 11, obstructions)).toBe(true);
      expect(isPositionInObstructions(8, 8, obstructions)).toBe(false);
    });
  });

  describe('isPositionInRoomObstruction()', () => {
    it('returns whether a position lies inside any obstruction in the room', () => {
      const room = _createRoom([
        createObstruction([{ x:5, y:5, width:4, height:4 }])
      ]);

      expect(isPositionInRoomObstruction(room, 6, 6)).toBe(true);
      expect(isPositionInRoomObstruction(room, 9, 6)).toBe(false);
    });
  });

  describe('clipMoveToObstructions()', () => {
    it('returns the destination unchanged for zero-distance movement', () => {
      const room = _createRoom([
        createObstruction([{ x:10, y:10, width:4, height:4 }])
      ]);

      expect(clipMoveToObstructions(room, { x:5, y:5 }, { x:5, y:5 })).toEqual({
        position:{ x:5, y:5 },
        wasClipped:false
      });
    });

    it('returns the destination unchanged when the path does not intersect obstruction margins', () => {
      const room = _createRoom([
        createObstruction([{ x:20, y:20, width:4, height:4 }])
      ]);

      expect(clipMoveToObstructions(room, { x:0, y:0 }, { x:10, y:0 })).toEqual({
        position:{ x:10, y:0 },
        wasClipped:false
      });
    });

    it('returns the destination unchanged when the move stops before reaching an obstruction margin', () => {
      const room = _createRoom([
        createObstruction([{ x:10, y:10, width:4, height:4 }])
      ]);

      expect(clipMoveToObstructions(room, { x:0, y:12 }, { x:5, y:12 })).toEqual({
        position:{ x:5, y:12 },
        wasClipped:false
      });
    });

    it('returns the destination unchanged when an obstruction would only be reached beyond the destination', () => {
      const room = _createRoom([
        createObstruction([{ x:10, y:10, width:4, height:4 }])
      ]);

      expect(clipMoveToObstructions(room, { x:0, y:12 }, { x:1, y:12 })).toEqual({
        position:{ x:1, y:12 },
        wasClipped:false
      });
    });

    it('returns the destination unchanged when the path only touches the exclusive bottom edge of an obstruction margin', () => {
      const room = _createRoom([
        createObstruction([{ x:10, y:10, width:4, height:4 }])
      ]);

      expect(clipMoveToObstructions(room, { x:0, y:14 + CHARACTER_OBSTRUCTION_MARGIN }, { x:20, y:14 + CHARACTER_OBSTRUCTION_MARGIN })).toEqual({
        position:{ x:20, y:14 + CHARACTER_OBSTRUCTION_MARGIN },
        wasClipped:false
      });
    });

    it('clips movement to stop one pixel before entering the obstruction margin', () => {
      const room = _createRoom([
        createObstruction([{ x:10, y:10, width:4, height:4 }])
      ]);

      expect(clipMoveToObstructions(room, { x:0, y:12 }, { x:20, y:12 })).toEqual({
        position:{ x:10 - CHARACTER_OBSTRUCTION_MARGIN - 1, y:12 },
        wasClipped:true
      });
    });

    it('returns the starting position when movement begins inside the obstruction margin', () => {
      const room = _createRoom([
        createObstruction([{ x:10, y:10, width:4, height:4 }])
      ]);

      expect(clipMoveToObstructions(room, { x:10 - CHARACTER_OBSTRUCTION_MARGIN + 1, y:12 }, { x:20, y:12 })).toEqual({
        position:{ x:10 - CHARACTER_OBSTRUCTION_MARGIN + 1, y:12 },
        wasClipped:true
      });
    });

    it('backs off multiple times when the first rounded candidate is still inside the obstruction margin', () => {
      const room = _createRoom([
        createObstruction([{ x:10, y:10, width:4, height:4 }])
      ]);

      expect(clipMoveToObstructions(room, { x:0, y:30 }, { x:8, y:0 })).toEqual({
        position:{ x:5, y:9 },
        wasClipped:true
      });
    });
  });
});
