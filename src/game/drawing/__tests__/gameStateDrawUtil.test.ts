import { describe, expect, it } from 'vitest';

import villageText from '../../../../public/levels/village.md?raw';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState } from '@/game/gameUtil';
import { updateScalingFactorsAsNeeded } from '../gameStateDrawUtil';

describe('gameStateDrawUtil', () => {
  describe('updateScalingFactorsAsNeeded()', () => {
    it('preserves active effects when the camera rect changes', () => {
      const level = loadLevelFromText(villageText, 'village.md');
      const gameState = createGameState(level);
      const sentinelEffect = { type:'sentinel-effect', startTime:123 } as never;
      const context = { canvas:{ width:1280, height:720 } } as CanvasRenderingContext2D;

      gameState.activeEffects.push(sentinelEffect);
      gameState.camera.currentRect = {
        ...gameState.camera.currentRect,
        x:gameState.camera.currentRect.x + 1,
        y:gameState.camera.currentRect.y + 1
      };

      updateScalingFactorsAsNeeded(gameState, context);

      expect(gameState.activeEffects).toContain(sentinelEffect);
    });

    it('preserves cached room title wraps when only the camera rect changes', () => {
      const level = loadLevelFromText(villageText, 'village.md');
      const gameState = createGameState(level);
      const context = { canvas:{ width:1280, height:720 } } as CanvasRenderingContext2D;

      updateScalingFactorsAsNeeded(gameState, context);
      gameState.roomTitleWrapsByRoomId.set('sentinel-room', ['Sentinel']);
      gameState.camera.currentRect = {
        ...gameState.camera.currentRect,
        x:gameState.camera.currentRect.x + 1,
        y:gameState.camera.currentRect.y + 1
      };

      updateScalingFactorsAsNeeded(gameState, context);

      expect(gameState.roomTitleWrapsByRoomId.get('sentinel-room')).toEqual(['Sentinel']);
    });

    it('clears cached room title wraps when the canvas dimensions change', () => {
      const level = loadLevelFromText(villageText, 'village.md');
      const gameState = createGameState(level);
      const initialContext = { canvas:{ width:1280, height:720 } } as CanvasRenderingContext2D;
      const resizedContext = { canvas:{ width:1024, height:720 } } as CanvasRenderingContext2D;

      updateScalingFactorsAsNeeded(gameState, initialContext);
      gameState.roomTitleWrapsByRoomId.set('sentinel-room', ['Sentinel']);

      updateScalingFactorsAsNeeded(gameState, resizedContext);

      expect(gameState.roomTitleWrapsByRoomId.size).toBe(0);
    });
  });
});