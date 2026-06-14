// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import itemEmitsActivityText from '../__tests__/fixtures/item-emits-activity.md?raw';
import { rebuildDynamicStateForTime } from '../dynamicStateRebuildUtil';
import { createGameState, updateAndDraw } from '../gameUtil';
import { loadLevelFromText } from '../../levelLoading/levelUtil';
import itemEmitsAdjacentRoomText from './fixtures/item-emits-adjacent-room.md?raw';

describe('item emits integration', () => {
  describe('updateAndDraw()', () => {
    it('draws emit bubbles for carried items that are not visible in hand', () => {
      const level = loadLevelFromText(itemEmitsActivityText);
      const gameState = createGameState(level);
      const drawnTexts:string[] = [];
      const context = _createMockContext(drawnTexts);

      rebuildDynamicStateForTime(gameState, 5_000, 0);
      updateAndDraw(gameState, context, () => {}, undefined, undefined, undefined, true);

      expect(drawnTexts).toContain('(clang)');
    });

    it('draws emit bubbles for audible adjacent-room item emits', () => {
      const level = loadLevelFromText(itemEmitsAdjacentRoomText);
      const gameState = createGameState(level);
      const drawnTexts:string[] = [];
      const context = _createMockContext(drawnTexts);

      gameState.rooms.forEach(room => { room.isDiscovered = true; });
      rebuildDynamicStateForTime(gameState, 1_000, 0);
      updateAndDraw(gameState, context, () => {}, undefined, undefined, undefined, true);

      expect(drawnTexts).toContain('(ring)');
    });
  });
});

function _createMockContext(drawnTexts:string[] = []):CanvasRenderingContext2D {
  return new Proxy({
    canvas:{ width:1280, height:720, style:{} },
    measureText:(text:string) => ({ width:text.length * 8, actualBoundingBoxAscent:0, actualBoundingBoxDescent:0 }),
    fillText:(text:string) => { drawnTexts.push(text); },
    strokeText:(text:string) => { drawnTexts.push(text); }
  } as unknown as CanvasRenderingContext2D, {
    get(target, property) {
      if (property in target) return (target as unknown as Record<PropertyKey, unknown>)[property];
      return () => {};
    },
    set(target, property, value) {
      (target as unknown as Record<PropertyKey, unknown>)[property] = value;
      return true;
    }
  });
}