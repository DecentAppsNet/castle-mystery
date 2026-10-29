import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';
import { createDefaultCharacter } from '@/game/types/Character';
import { createWalkEffect } from '@/game/effects/walkEffectUtil';
import { addCharacterEffect, addCharacterKeyChanges, createEditableTimeline } from '../editingUtil';
import EditableTimeline from '../types/EditableTimeline';
import { scheduleWalkingEffects } from '../walkingEffectSchedulingUtil';

function _createTimeline() {
  return createEditableTimeline([
    { ...createDefaultCharacter(), id:'alpha' },
    { ...createDefaultCharacter(), id:'beta' }
  ], [], 0);
}

function _walksAt(timeline:EditableTimeline, time:number, characterI = 0) {
  return createKeyframeAtTime(timeline.keyframes, time).characters[characterI].effects
    .filter(effect => effect.kind === 'walk');
}

describe('walkingEffectSchedulingUtil', () => {
  describe('scheduleWalkingEffects()', () => {
    it('coalesces touching intervals regardless of recording order without mutating descriptors', () => {
      const timeline = _createTimeline();
      const intervals = [
        { characterI:0, startTime:300, endTime:500 },
        { characterI:0, startTime:100, endTime:300 }
      ];
      timeline.pendingWalkingIntervals.push(...intervals);

      scheduleWalkingEffects(timeline);

      expect(_walksAt(timeline, 300)).toMatchObject([{ startTime:100, endTime:500 }]);
      expect(timeline.pendingWalkingIntervals).toEqual(intervals);
    });

    it('preserves a positive stationary gap', () => {
      const timeline = _createTimeline();
      timeline.pendingWalkingIntervals.push(
        { characterI:0, startTime:100, endTime:300 },
        { characterI:0, startTime:301, endTime:500 }
      );

      scheduleWalkingEffects(timeline);

      expect(_walksAt(timeline, 200)).toMatchObject([{ startTime:100, endTime:300 }]);
      expect(_walksAt(timeline, 300)).toEqual([]);
      expect(_walksAt(timeline, 400)).toMatchObject([{ startTime:301, endTime:500 }]);
    });

    it('merges overlapping and contained intervals without double animation', () => {
      const timeline = _createTimeline();
      timeline.pendingWalkingIntervals.push(
        { characterI:0, startTime:100, endTime:400 },
        { characterI:0, startTime:200, endTime:300 },
        { characterI:0, startTime:350, endTime:500 }
      );

      scheduleWalkingEffects(timeline);

      expect(_walksAt(timeline, 250)).toMatchObject([{ startTime:100, endTime:500 }]);
      expect(_walksAt(timeline, 450)).toMatchObject([{ startTime:100, endTime:500 }]);
    });

    it('keeps characters independent', () => {
      const timeline = _createTimeline();
      timeline.pendingWalkingIntervals.push(
        { characterI:1, startTime:200, endTime:400 },
        { characterI:0, startTime:100, endTime:300 }
      );

      scheduleWalkingEffects(timeline);

      expect(_walksAt(timeline, 250, 0)).toMatchObject([{ startTime:100, endTime:300 }]);
      expect(_walksAt(timeline, 250, 1)).toMatchObject([{ startTime:200, endTime:400 }]);
      expect(_walksAt(timeline, 300, 0)).toEqual([]);
      expect(_walksAt(timeline, 300, 1)).toHaveLength(1);
    });

    it('leaves an empty schedule unchanged', () => {
      const timeline = _createTimeline();
      const keyframes = timeline.keyframes;

      scheduleWalkingEffects(timeline);

      expect(timeline.keyframes).toBe(keyframes);
      expect(_walksAt(timeline, 0)).toEqual([]);
    });

    it('makes effects active from start inclusive to end exclusive', () => {
      const timeline = _createTimeline();
      timeline.pendingWalkingIntervals.push({ characterI:0, startTime:100, endTime:500 });

      scheduleWalkingEffects(timeline);

      expect(_walksAt(timeline, 99)).toEqual([]);
      expect(_walksAt(timeline, 100)).toHaveLength(1);
      expect(_walksAt(timeline, 300)).toHaveLength(1);
      expect(_walksAt(timeline, 500)).toEqual([]);
      expect(_walksAt(timeline, 501)).toEqual([]);
    });

    it('preserves positions, existing effects, and the walk origin across internal keyframes', () => {
      const timeline = _createTimeline();
      addCharacterKeyChanges({ position:{ x:0, y:0, z:0 } }, 0, 100, timeline);
      addCharacterKeyChanges({ position:{ x:5, y:0, z:0 } }, 0, 300, timeline);
      addCharacterKeyChanges({ position:{ x:10, y:0, z:0 } }, 0, 500, timeline);
      addCharacterKeyChanges({ isVisible:false }, 1, 350, timeline);
      addCharacterEffect({ kind:'says', startTime:50, endTime:600, handler:null }, 0, timeline);
      const before = createKeyframeAtTime(timeline.keyframes, 350).characters[0];
      timeline.pendingWalkingIntervals.push(
        { characterI:0, startTime:100, endTime:300 },
        { characterI:0, startTime:300, endTime:500 }
      );

      scheduleWalkingEffects(timeline);

      const after = createKeyframeAtTime(timeline.keyframes, 350).characters[0];
      expect(after.position).toEqual(before.position);
      expect(after.effects.filter(effect => effect.kind !== 'walk')).toEqual(before.effects);
      expect(_walksAt(timeline, 300)).toMatchObject([{ startTime:100, endTime:500 }]);
      expect(_walksAt(timeline, 350)).toMatchObject([{ startTime:100, endTime:500 }]);
      expect(_walksAt(timeline, 500)).toEqual([]);
      expect(_walksAt(timeline, 350)[0].handler?.(
        { stage:'beforeCharacter', characterContext:{} as never }, {} as never, 350, 0, {} as never
      )).toEqual(createWalkEffect(100, 500).handler?.(
        { stage:'beforeCharacter', characterContext:{} as never }, {} as never, 350, 0, {} as never
      ));
    });
  });
});