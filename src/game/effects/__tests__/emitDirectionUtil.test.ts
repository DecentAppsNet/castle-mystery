import { describe, expect, it } from 'vitest';

import { findEmitTipDirection } from '../emitDirectionUtil';

const ACTIVE_RECT = { x:10, y:10, width:4, height:4 };

describe('findEmitTipDirection()', () => {
  it('returns no tip for the active room', () => {
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'hall', { x:0, y:0, width:2, height:2 })).toBeNull();
  });

  it('classifies an upward cardinal ray intersection', () => {
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'tower', { x:11, y:2, width:2, height:3 })).toBe('up');
  });

  it('classifies a rightward cardinal ray intersection', () => {
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'tower', { x:20, y:11, width:3, height:2 })).toBe('right');
  });

  it('classifies a downward cardinal ray intersection', () => {
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'tower', { x:11, y:20, width:2, height:3 })).toBe('bottom');
  });

  it('classifies a leftward cardinal ray intersection', () => {
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'tower', { x:2, y:11, width:3, height:2 })).toBe('left');
  });

  it('classifies each diagonal from room centers', () => {
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'ul', { x:2, y:2, width:2, height:2 })).toBe('up-left');
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'ur', { x:20, y:2, width:2, height:2 })).toBe('up-right');
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'bl', { x:2, y:20, width:2, height:2 })).toBe('bottom-left');
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'br', { x:20, y:20, width:2, height:2 })).toBe('bottom-right');
  });

  it('includes perpendicular rectangle boundaries', () => {
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'tower', { x:12, y:2, width:3, height:2 })).toBe('up');
  });

  it('requires intersection strictly beyond the center on the travel axis', () => {
    expect(() => findEmitTipDirection('hall', ACTIVE_RECT, 'tower', { x:12, y:11, width:2, height:2 }))
      .toThrow('Assertion failed.');
  });

  it('uses a cardinal intersection before diagonal center fallback', () => {
    expect(findEmitTipDirection('hall', ACTIVE_RECT, 'tower', { x:12, y:2, width:3, height:3 })).toBe('up');
  });

  it('classifies differently sized rooms by the source rectangle', () => {
    expect(findEmitTipDirection('hall', { x:10, y:10, width:10, height:2 },
      'tower', { x:14, y:-20, width:20, height:5 })).toBe('up');
  });

  it('asserts when distinct geometry has no cardinal or diagonal direction', () => {
    expect(() => findEmitTipDirection('hall', ACTIVE_RECT, 'tower', { x:12, y:12, width:0, height:0 }))
      .toThrow('Assertion failed.');
  });
});