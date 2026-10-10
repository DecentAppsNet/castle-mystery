import { describe, expect, it } from 'vitest';

import { createGameState, updateGameState } from '@/game/gameUtil';
import PlayerEventType from '@/game/playerEvents/types/PlayerEventType';
import { loadValidLevelForTest, replaceSection } from '@/levelLoading/__tests__/testLevelUtil';
import levelTimesBaseText from '@/levelLoading/__tests__/fixtures/level-times-base.md?raw';

describe('gameUtil', () => {
  describe('createGameState()', () => {
    it('shares the completed timeline without storing duplicate timing bounds', () => {
      const level = loadValidLevelForTest(levelTimesBaseText);
      const gameState = createGameState(level);

      expect(gameState.timeline).toBe(level.timeline);
      expect(gameState.time).toBe(level.initialTime);
      expect(gameState).not.toHaveProperty('startTime');
      expect(gameState).not.toHaveProperty('duration');
    });
  });

  describe('updateGameState()', () => {
    it('advances within a nonzero-start range using the playback clock offset', () => {
      const text = replaceSection(levelTimesBaseText, 'itinerary', ['0:00:03 Sam sits', '0:00:05 Sam stands']);
      const level = loadValidLevelForTest(text);
      const gameState = createGameState(level);

      updateGameState(gameState, [{ type:PlayerEventType.PLAY_PAUSE, isPlaying:true }], 100, 1);
      updateGameState(gameState, [], 600, 1);

      expect(gameState.timeline.startTime).toBe(3_000);
      expect(gameState.timeline.endTime).toBe(5_000);
      expect(gameState.time).toBe(3_500);
      expect(gameState.isPlaying).toBe(true);
      expect(gameState.metaTimeToGameTimeOffset).toBe(2_900);
      expect(gameState.timelineSnapshot.activeCharacter.bodyOrientation).toBe('sitting');
      expect(gameState.timeline).toBe(level.timeline);
    });

    it('clamps an overshoot to the timeline endpoint and pauses', () => {
      const text = replaceSection(levelTimesBaseText, 'itinerary', ['0:00:03 Sam sits', '0:00:05 Sam stands']);
      const gameState = createGameState(loadValidLevelForTest(text));

      updateGameState(gameState, [{ type:PlayerEventType.PLAY_PAUSE, isPlaying:true }], 100, 1);
      updateGameState(gameState, [], 2_600, 1);

      expect(gameState.time).toBe(5_000);
      expect(gameState.isPlaying).toBe(false);
      expect(gameState.metaTimeToGameTimeOffset).toBe(0);
      expect(gameState.metaTimeEffects).toEqual([
        expect.objectContaining({ kind:'pause', startTime:2_600 })
      ]);
      expect(gameState.timelineSnapshot.activeCharacter.bodyOrientation).toBe('standing');
    });

    it('pauses at the exact endpoint without repeating pause feedback on a later frame', () => {
      const text = replaceSection(levelTimesBaseText, 'itinerary', ['0:00:03 Sam sits', '0:00:05 Sam stands']);
      const gameState = createGameState(loadValidLevelForTest(text));

      updateGameState(gameState, [{ type:PlayerEventType.PLAY_PAUSE, isPlaying:true }], 100, 1);
      updateGameState(gameState, [], 2_100, 1);

      expect(gameState.time).toBe(5_000);
      expect(gameState.isPlaying).toBe(false);
      expect(gameState.metaTimeToGameTimeOffset).toBe(0);
      const pauseEffect = gameState.metaTimeEffects[0];
      expect(pauseEffect).toMatchObject({ kind:'pause', startTime:2_100 });

      updateGameState(gameState, [], 2_200, 1);

      expect(gameState.time).toBe(5_000);
      expect(gameState.isPlaying).toBe(false);
      expect(gameState.metaTimeEffects).toEqual([pauseEffect]);
    });

    it('immediately pauses a zero-length range with a nonzero start', () => {
      const gameState = createGameState(loadValidLevelForTest(levelTimesBaseText));

      updateGameState(gameState, [{ type:PlayerEventType.PLAY_PAUSE, isPlaying:true }], 100, 1);

      expect(gameState.timeline.startTime).toBe(3_000);
      expect(gameState.timeline.endTime).toBe(3_000);
      expect(gameState.time).toBe(3_000);
      expect(gameState.isPlaying).toBe(false);
      expect(gameState.metaTimeToGameTimeOffset).toBe(0);
      expect(gameState.metaTimeEffects.map(effect => effect.kind)).toEqual(['play', 'pause']);
    });

    it('preserves zero-length playback for an empty itinerary', () => {
      const text = replaceSection(levelTimesBaseText, 'itinerary', []);
      const gameState = createGameState(loadValidLevelForTest(text));

      updateGameState(gameState, [{ type:PlayerEventType.PLAY_PAUSE, isPlaying:true }], 100, 1);

      expect(gameState.timeline.startTime).toBe(0);
      expect(gameState.timeline.endTime).toBe(0);
      expect(gameState.time).toBe(0);
      expect(gameState.isPlaying).toBe(false);
      expect(gameState.metaTimeToGameTimeOffset).toBe(0);
    });
  });
});