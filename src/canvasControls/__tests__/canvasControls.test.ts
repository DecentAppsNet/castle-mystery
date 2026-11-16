import { describe, expect, it } from 'vitest';
import { calcClampedDragCenter, calcDragGrabOffset, createLayout, findControlAtPoint,
  findTopmostControlAtPoint, hideControl, updateControlRect } from '..';
import Control from '../types/Control';

type TestControl = Control & { readonly label:string };

describe('canvasControls', () => {
  describe('calcDragGrabOffset()', () => {
    it('captures the signed pointer offset from the rectangle center', () => {
      expect(calcDragGrabOffset({ x:100, y:50, width:40, height:20 }, 105, 65)).toEqual([-15, 5]);
    });
  });

  describe('calcClampedDragCenter()', () => {
    const bounds = { x:100, y:50, width:200, height:100 };

    it('preserves an off-center grab without an initial jump', () => {
      const offset = calcDragGrabOffset({ x:100, y:50, width:40, height:20 }, 105, 65);
      expect(calcClampedDragCenter(offset, bounds, 105, 65)).toEqual([120, 60]);
      expect(calcClampedDragCenter(offset, bounds, 155, 90)).toEqual([170, 85]);
    });

    it('clamps the center at the left and right edges', () => {
      expect(calcClampedDragCenter([10, -5], bounds, -100, 95)).toEqual([100, 100]);
      expect(calcClampedDragCenter([10, -5], bounds, 500, 95)).toEqual([300, 100]);
    });

    it('clamps the center at the top and bottom edges', () => {
      expect(calcClampedDragCenter([10, -5], bounds, 210, -100)).toEqual([200, 50]);
      expect(calcClampedDragCenter([10, -5], bounds, 210, 500)).toEqual([200, 150]);
    });

    it('clamps independently at all four corners', () => {
      expect(calcClampedDragCenter([10, -5], bounds, -100, -100)).toEqual([100, 50]);
      expect(calcClampedDragCenter([10, -5], bounds, 500, -100)).toEqual([300, 50]);
      expect(calcClampedDragCenter([10, -5], bounds, -100, 500)).toEqual([100, 150]);
      expect(calcClampedDragCenter([10, -5], bounds, 500, 500)).toEqual([300, 150]);
    });

    it('retains the original offset after leaving and reentering the bounds', () => {
      const offset = calcDragGrabOffset({ x:100, y:50, width:40, height:20 }, 105, 65);
      expect(calcClampedDragCenter(offset, bounds, -500, -500)).toEqual([100, 50]);
      expect(calcClampedDragCenter(offset, bounds, 155, 90)).toEqual([170, 85]);
      expect(offset).toEqual([-15, 5]);
    });
  });

  describe('findTopmostControlAtPoint()', () => {
    it('returns the last overlapping control by reference', () => {
      const lower = { rect:{ x:0, y:0, width:20, height:20 }, isVisible:true };
      const upper = { rect:{ x:10, y:10, width:20, height:20 }, isVisible:true };
      expect(findTopmostControlAtPoint([lower, upper], 15, 15)).toBe(upper);
    });

    it('returns the lower control where the upper control does not overlap', () => {
      const lower = { rect:{ x:0, y:0, width:20, height:20 }, isVisible:true };
      const upper = { rect:{ x:10, y:10, width:20, height:20 }, isVisible:true };
      expect(findTopmostControlAtPoint([lower, upper], 5, 5)).toBe(lower);
    });

    it('preserves caller-defined members in the returned type', () => {
      const control:TestControl = { rect:{ x:0, y:0, width:20, height:20 }, isVisible:true, label:'piece' };
      expect(findTopmostControlAtPoint([control], 10, 10)?.label).toBe('piece');
    });

    it('skips a hidden topmost control', () => {
      const lower = { rect:{ x:0, y:0, width:20, height:20 }, isVisible:true };
      const upper = { rect:{ x:0, y:0, width:20, height:20 }, isVisible:false };
      expect(findTopmostControlAtPoint([lower, upper], 10, 10)).toBe(lower);
    });

    it('returns null outside all rectangles', () => {
      const control = { rect:{ x:10, y:10, width:20, height:20 }, isVisible:true };
      expect(findTopmostControlAtPoint([control], 0, 0)).toBeNull();
    });

    it('returns null for empty records', () => {
      expect(findTopmostControlAtPoint([], 10, 10)).toBeNull();
    });
  });

  describe('findControlAtPoint()', () => {
    it('returns the last overlapping control ID', () => {
      const layout = createLayout();
      updateControlRect('first', { x:0, y:0, width:20, height:20 }, layout);
      updateControlRect('second', { x:0, y:0, width:20, height:20 }, layout);
      expect(findControlAtPoint(layout, 10, 10)).toBe('second');
    });

    it('still skips hidden controls', () => {
      const layout = createLayout();
      updateControlRect('first', { x:0, y:0, width:20, height:20 }, layout);
      updateControlRect('second', { x:0, y:0, width:20, height:20 }, layout);
      hideControl('second', layout);
      expect(findControlAtPoint(layout, 10, 10)).toBe('first');
    });

    it('still returns null outside controls', () => {
      const layout = createLayout();
      updateControlRect('first', { x:0, y:0, width:20, height:20 }, layout);
      expect(findControlAtPoint(layout, 30, 30)).toBeNull();
    });
  });
});