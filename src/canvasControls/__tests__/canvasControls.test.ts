import { describe, expect, it } from 'vitest';
import { createLayout, findControlAtPoint, findTopmostControlAtPoint, hideControl, updateControlRect } from '..';
import Control from '../types/Control';

type TestControl = Control & { readonly label:string };

describe('canvasControls', () => {
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