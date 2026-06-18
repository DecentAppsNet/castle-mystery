// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import timelineBothTimeAndStartTimeText from '@/game/__tests__/fixtures/timeline-both-time-and-start-time.md?raw';
import { calcRenderedRoomsBoundingRect } from '@/game/roomRoofUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { createGameState } from '../gameUtil';

describe('timeline initialization integration', () => {
  it('starts the game state at time while preserving authored slider bounds from startTime and endTime', () => {
    const level = loadLevelFromText(timelineBothTimeAndStartTimeText, 'timeline-both.md');
    const gameState = createGameState(level);

    expect(level.startTime).toBe(10 * 60 * 60 * 1000);
    expect(level.initialTime).toBe(10 * 60 * 60 * 1000 + 30 * 60 * 1000);
    expect(level.endTime).toBe(12 * 60 * 60 * 1000);

    expect(gameState.startTime).toBe(level.startTime);
    expect(gameState.duration).toBe(level.duration);
    expect(gameState.time).toBe(level.initialTime);
    expect(gameState.groundFloorY).toBe(level.groundFloorY);
    expect(gameState.labels[0]?.minutes).toBe(10 * 60);
    expect(gameState.labels[gameState.labels.length - 1]?.minutes).toBe(12 * 60);
  });

  it('initializes the camera from the full level bounds before the first draw retargets it', () => {
    const level = loadLevelFromText(timelineBothTimeAndStartTimeText, 'timeline-both.md');
    const gameState = createGameState(level);

    expect(gameState.camera.currentRect).toEqual(calcRenderedRoomsBoundingRect(level.rooms, level.groundFloorY));
    expect(gameState.camera.targetRect).toEqual(calcRenderedRoomsBoundingRect(level.rooms, level.groundFloorY));
    expect(gameState.camera.isMoving).toBe(false);
  });
});