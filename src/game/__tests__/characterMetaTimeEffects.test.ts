import { describe, expect, it } from 'vitest';

import { createGameState, updateGameState } from '@/game/gameUtil';
import { createKeyframeAtTime, createTimelineSnapshot } from '@/game/timeline';
import Effect from '@/game/effects/types/Effect';
import { loadValidLevelForTest } from '@/levelLoading/__tests__/testLevelUtil';
import discoveryStateLevelText from './fixtures/discovery-state.md?raw';

describe('character meta-time effects', () => {
  it('preserves the timeline effects array when a character has no meta-time effects', () => {
    const gameState = createGameState(loadValidLevelForTest(discoveryStateLevelText, 'discovery-state.md'));
    const keyframe = createKeyframeAtTime(gameState.timeline.keyframes, gameState.time);
    const samI = gameState.timeline.characterIdToI.sam;

    const snapshot = createTimelineSnapshot(gameState, gameState.time);

    expect(snapshot.characters[samI].effects).toBe(keyframe.characters[samI].effects);
  });

  it('combines timeline effects before character meta-time effects without mutating either source', () => {
    const gameState = createGameState(loadValidLevelForTest(discoveryStateLevelText, 'discovery-state.md'));
    const samI = gameState.timeline.characterIdToI.sam;
    const timelineEffect:Effect = { kind:'says', startTime:0, endTime:1000, handler:null };
    const metaTimeEffect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };
    const timelineEffects = gameState.timeline.keyframes[0].characters[samI].effects;
    const characterMetaTimeEffects = [metaTimeEffect];
    timelineEffects.push(timelineEffect);
    gameState.characterMetaTimeEffectsByCharacterId.set('sam', characterMetaTimeEffects);

    const snapshot = createTimelineSnapshot(gameState, gameState.time);

    expect(snapshot.characters[samI].effects).toEqual([timelineEffect, metaTimeEffect]);
    expect(snapshot.characters[samI].effects).not.toBe(timelineEffects);
    expect(timelineEffects).toEqual([timelineEffect]);
    expect(characterMetaTimeEffects).toEqual([metaTimeEffect]);
  });

  it('scopes meta-time effects to their target characters', () => {
    const gameState = createGameState(loadValidLevelForTest(discoveryStateLevelText, 'discovery-state.md'));
    const samEffect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };
    const patEffect:Effect = { kind:'pause', startTime:100, endTime:200, handler:null };
    const samEffects = [samEffect];
    const patEffects = [patEffect];
    gameState.characterMetaTimeEffectsByCharacterId.set('sam', samEffects);
    gameState.characterMetaTimeEffectsByCharacterId.set('pat', patEffects);

    const snapshot = createTimelineSnapshot(gameState, gameState.time);

    expect(snapshot.characters[gameState.timeline.characterIdToI.sam].effects).toBe(samEffects);
    expect(snapshot.characters[gameState.timeline.characterIdToI.pat].effects).toBe(patEffects);
  });

  it('refreshes a paused frame snapshot after removing expired effects', () => {
    const gameState = createGameState(loadValidLevelForTest(discoveryStateLevelText, 'discovery-state.md'));
    const expiredEffect:Effect = { kind:'play', startTime:100, endTime:200, handler:null };
    gameState.characterMetaTimeEffectsByCharacterId.set('sam', [expiredEffect]);
    gameState.timelineSnapshot = createTimelineSnapshot(gameState, gameState.time);
    const staleSnapshot = gameState.timelineSnapshot;

    updateGameState(gameState, [], 200, 1);

    expect(gameState.isPlaying).toBe(false);
    expect(gameState.timelineSnapshot).not.toBe(staleSnapshot);
    expect(gameState.characterMetaTimeEffectsByCharacterId.has('sam')).toBe(false);
    expect(gameState.timelineSnapshot.characters[gameState.timeline.characterIdToI.sam].effects).not.toContain(expiredEffect);
  });
});